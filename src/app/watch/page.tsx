'use client';

import { useState } from 'react';
import { useLocationTracking } from '@/lib/hooks/useLocationTracking';
import { usePedometer } from '@/lib/hooks/usePedometer';
import { useAuth } from '@/context/AuthContext';
import { saveRun, todayDateString, generateId } from '@/lib/firestore';
import { Play, Square, Pause, Gauge, TrendingUp } from 'lucide-react';
import type { Run } from '@/types';

function fmtTime(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function WatchPage() {
  const { user } = useAuth();
  const tracker = useLocationTracking();
  const pedometer = usePedometer();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleStart = async () => {
    if (pedometer.isAvailable === false) {
      await pedometer.requestPermission();
    }
    pedometer.setSteps(0);
    setSaved(false);
    tracker.startTracking();
  };

  const handlePause = () => {
    if (tracker.isPaused) {
      tracker.resumeTracking();
    } else {
      tracker.pauseTracking();
    }
  };

  const handleStop = async () => {
    tracker.stopTracking();
    if (user && tracker.distance > 0) {
      setSaving(true);
      const durationSecs = Math.ceil(tracker.elapsedMs / 1000);
      const run: Run = {
        id: generateId(),
        date: todayDateString(),
        duration: durationSecs,
        distance: tracker.distance,
        averagePace: tracker.distance > 0 ? durationSecs / (tracker.distance / 1000) : 0,
        createdAt: Date.now(),
      };
      await saveRun(user.uid, run, tracker.route);
      setSaving(false);
      setSaved(true);
    }
  };

  const distKm = (tracker.distance / 1000).toFixed(2);

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full max-w-[300px] gap-5">
      {/* Main display ring */}
      <div className="flex flex-col items-center p-5 rounded-full border-4 border-[#222] bg-[#111] aspect-square justify-center w-52 shadow-[0_0_20px_rgba(255,100,50,0.25)]">
        <span className="text-3xl font-mono font-bold tracking-wider">
          {fmtTime(tracker.elapsedMs)}
        </span>
        <span className="text-xl text-emerald-400 mt-1 font-semibold">{distKm} km</span>
        {pedometer.steps > 0 && (
          <span className="text-sm text-text-tertiary mt-0.5">{pedometer.steps} steps</span>
        )}
      </div>

      {/* Speed stats (visible when tracking) */}
      {tracker.isTracking && (
        <div className="flex gap-4 text-center animate-fade-in">
          <div className="flex flex-col items-center gap-0.5">
            <Gauge size={14} className="text-accent" />
            <span className="text-xs text-text-tertiary">Speed</span>
            <span className="text-sm font-bold">{tracker.currentSpeed.toFixed(1)}</span>
            <span className="text-[10px] text-text-tertiary">km/h</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <TrendingUp size={14} className="text-success" />
            <span className="text-xs text-text-tertiary">Avg</span>
            <span className="text-sm font-bold">{tracker.averageSpeed.toFixed(1)}</span>
            <span className="text-[10px] text-text-tertiary">km/h</span>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-4 mt-1">
        {!tracker.isTracking ? (
          <button
            onClick={handleStart}
            disabled={saving}
            className="p-5 bg-success text-white rounded-full active:scale-95 transition-transform
                       hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] disabled:opacity-50"
          >
            <Play size={36} className="fill-current" />
          </button>
        ) : (
          <>
            <button
              onClick={handlePause}
              className="p-4 bg-warning text-black rounded-full active:scale-95 transition-transform"
            >
              {tracker.isPaused ? (
                <Play size={28} className="fill-current" />
              ) : (
                <Pause size={28} className="fill-current" />
              )}
            </button>
            <button
              onClick={handleStop}
              className="p-4 bg-danger text-white rounded-full active:scale-95 transition-transform
                         hover:shadow-[0_0_20px_rgba(239,68,68,0.5)]"
            >
              <Square size={28} className="fill-current" />
            </button>
          </>
        )}
      </div>

      {/* Status messages */}
      {saving && <p className="text-text-tertiary text-xs animate-pulse">Saving workout…</p>}
      {saved && <p className="text-success text-xs font-semibold">✓ Workout saved!</p>}
      {tracker.error && <p className="text-danger text-xs text-center">{tracker.error}</p>}
    </div>
  );
}
