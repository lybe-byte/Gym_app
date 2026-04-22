'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLocationTracking } from '@/lib/hooks/useLocationTracking';
import { usePedometer } from '@/lib/hooks/usePedometer';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { saveRun, todayDateString, generateId } from '@/lib/firestore';
import MapView from '@/components/MapView';
import {
  Play,
  Pause,
  Square,
  MapPin,
  Timer,
  Gauge,
  TrendingUp,
  Footprints,
  Route,
  ChevronDown,
  ChevronUp,
  CloudRain,
  Wind,
  Thermometer,
} from 'lucide-react';
import type { Run } from '@/types';

/** Format milliseconds as HH:MM:SS */
function fmtTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function OutdoorTracker() {
  const { user } = useAuth();
  const router = useRouter();
  const pedometer = usePedometer();
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const { weight: userWeight } = useSettings();
  const tracker = useLocationTracking(userWeight);
  
  // Weather state
  const [weather, setWeather] = useState<{ temp: number; wind: number; rainProb: number } | null>(null);

  // Fetch weather on mount
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${pos.coords.latitude}&longitude=${pos.coords.longitude}&current=temperature_2m,wind_speed_10m,precipitation_probability`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.current) {
          setWeather({
            temp: data.current.temperature_2m,
            wind: data.current.wind_speed_10m,
            rainProb: data.current.precipitation_probability,
          });
        }
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      }
    });
  }, []);

  const handleStart = async () => {
    // On iOS, we must request permission from a user gesture if it's not already granted (null or false)
    if (pedometer.isAvailable !== true) {
      await pedometer.requestPermission();
    }
    pedometer.setSteps(0);
    tracker.startTracking();
    setExpanded(true);
  };

  const handlePauseResume = () => {
    if (tracker.isPaused) {
      tracker.resumeTracking();
    } else {
      tracker.pauseTracking();
    }
  };

  const handleStop = async () => {
    tracker.stopTracking();
    if (!user) return;
    
    setSaving(true);
    const durationSecs = Math.ceil(tracker.elapsedMs / 1000);
    
    // 1. Save Run Data
    if (tracker.distance >= 1) {
      const run: Run = {
        id: generateId(),
        date: todayDateString(),
        duration: durationSecs,
        distance: tracker.distance,
        averagePace: tracker.distance > 0 ? durationSecs / (tracker.distance / 1000) : 0,
        createdAt: Date.now(),
      };
      await saveRun(user.uid, run, tracker.route);
    }

    // Formula was: ~0.75 calories per kg per km. 
    // Now we use the cumulative calories calculated by the tracker hook which is speed/intensity aware.
    const sessionDistance = tracker.distance;
    const sessionSteps = pedometer.steps;
    const sessionCalories = Math.round(tracker.calories);

    try {
      const { getStepDataForDate, saveStepData } = await import('@/lib/firestore');
      const existing = await getStepDataForDate(user.uid, todayDateString());
      
      const newStepData = {
        date: todayDateString(),
        steps: (existing?.steps || 0) + sessionSteps,
        distance: (existing?.distance || 0) + sessionDistance,
        calories: (existing?.calories || 0) + sessionCalories,
        updatedAt: Date.now(),
      };
      
      await saveStepData(user.uid, newStepData);
    } catch (err) {
      console.error("Failed to save step data:", err);
    }

    setSaving(false);
    pedometer.setSteps(0);
    
    // Redirect to history so the user sees their saved run immediately
    router.push('/history');
  };

  const distKm = (tracker.distance / 1000).toFixed(2);

  // ── Idle state — show the start button ─────────────────
  if (!tracker.isTracking) {
    return (
      <div className="flex flex-col gap-3">
        {/* Weather Preview */}
        {weather && (
          <div className="flex items-center justify-between px-4 py-3 bg-bg-secondary border border-border-color rounded-2xl shadow-card-shadow animate-fade-in text-sm">
            <div className="flex items-center gap-2">
              <Thermometer size={18} className="text-accent" />
              <span className="font-bold">{weather.temp}°C</span>
            </div>
            <div className="w-px h-6 bg-border-color" />
            <div className="flex items-center gap-2">
              <Wind size={18} className="text-info" />
              <span className="font-bold">{weather.wind} km/h</span>
            </div>
            <div className="w-px h-6 bg-border-color" />
            <div className="flex items-center gap-2">
              <CloudRain size={18} className="text-info" />
              <span className="font-bold">{weather.rainProb}% rain</span>
            </div>
          </div>
        )}
        
        <button
          onClick={handleStart}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-lg
                     bg-gradient-to-r from-emerald-500 to-teal-500 text-white
                     shadow-[0_4px_20px_rgba(16,185,129,0.35)]
                     hover:shadow-[0_6px_28px_rgba(16,185,129,0.5)]
                     active:scale-[0.97] transition-all"
        >
          <MapPin size={22} />
          Start Outdoor Workout
        </button>
      </div>
    );
  }

  // ── Active tracking ────────────────────────────────────
  return (
    <div className="bg-bg-secondary border border-border-color rounded-2xl shadow-card-shadow overflow-hidden animate-fade-in">
      {/* Header — always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${tracker.isLocating ? 'bg-warning' : 'bg-success'} opacity-75`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${tracker.isLocating ? 'bg-warning' : 'bg-success'}`} />
          </span>
          <span className="font-bold text-text-primary text-sm">
            {tracker.isLocating ? 'Locating starting point...' : 'Tracking Active'}
          </span>
        </div>
        {!tracker.isLocating && (
          <div className="flex items-center gap-4 text-sm font-mono">
            <span className="text-text-secondary">{fmtTime(tracker.elapsedMs)}</span>
            <span className="text-accent font-bold">{distKm} km</span>
            {expanded ? <ChevronUp size={16} className="text-text-tertiary" /> : <ChevronDown size={16} className="text-text-tertiary" />}
          </div>
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 animate-fade-in">
          {/* Live map */}
          <MapView route={tracker.route} height="200px" live />

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard icon={<Timer size={16} />} label="Time" value={fmtTime(tracker.elapsedMs)} />
            <StatCard icon={<Route size={16} />} label="Distance" value={`${distKm} km`} />
            <StatCard icon={<Gauge size={16} />} label="Speed" value={`${tracker.currentSpeed.toFixed(1)} km/h`} />
            <StatCard 
              icon={<TrendingUp size={16} />} 
              label="Calories" 
              value={`${Math.round(tracker.calories)} kcal`} 
            />
            {pedometer.steps > 0 && (
              <StatCard icon={<Footprints size={16} />} label="Steps" value={pedometer.steps.toLocaleString()} />
            )}
            <StatCard icon={<TrendingUp size={16} />} label="Avg Speed" value={`${tracker.averageSpeed.toFixed(1)} km/h`} />
          </div>

          {/* Controls */}
          <div className="flex gap-3 mt-1">
            <button
              onClick={handlePauseResume}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
                         bg-warning/15 text-warning border border-warning/30
                         hover:bg-warning/25 active:scale-[0.97] transition-all"
            >
              {tracker.isPaused ? <Play size={18} /> : <Pause size={18} />}
              {tracker.isPaused ? 'Resume' : 'Pause'}
            </button>
            <button
              onClick={handleStop}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
                         bg-danger/15 text-danger border border-danger/30
                         hover:bg-danger/25 active:scale-[0.97] transition-all
                         disabled:opacity-50"
            >
              <Square size={18} />
              {saving ? 'Saving…' : 'Stop & Save'}
            </button>
          </div>

          {tracker.error && (
            <p className="text-danger text-xs text-center">{tracker.error}</p>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-bg-tertiary/50 rounded-xl px-3 py-2.5">
      <span className="text-accent">{icon}</span>
      <div className="flex flex-col">
        <span className="text-[10px] text-text-tertiary uppercase tracking-wider font-semibold">{label}</span>
        <span className="text-sm font-bold text-text-primary">{value}</span>
      </div>
    </div>
  );
}
