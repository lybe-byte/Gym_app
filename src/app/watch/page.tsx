'use client';

import { useState, useEffect } from 'react';
import { useLocationTracking } from '@/lib/hooks/useLocationTracking';
import { usePedometer } from '@/lib/hooks/usePedometer';
import { useAuth } from '@/context/AuthContext';
import { saveRun, todayDateString, generateId } from '@/lib/firestore';
import { Play, Square, Pause } from 'lucide-react';
import type { Run } from '@/types';

export default function WatchPage() {
  const { user } = useAuth();
  const location = useLocationTracking();
  const pedometer = usePedometer();
  
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (location.isTracking && !isPaused) {
      interval = setInterval(() => {
        setElapsedMs(prev => prev + 1000);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [location.isTracking, isPaused]);

  const handleStart = async () => {
    if (pedometer.isAvailable === false) {
       await pedometer.requestPermission();
    }
    location.startTracking();
    setElapsedMs(0);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = async () => {
    location.stopTracking();
    if (user && location.distance > 0) {
      const run: Run = {
        id: generateId(),
        date: todayDateString(),
        duration: Math.ceil(elapsedMs / 1000),
        distance: location.distance,
        averagePace: location.distance > 0 ? (elapsedMs / 1000) / location.distance : 0,
        createdAt: Date.now()
      };
      await saveRun(user.uid, run, location.route);
      alert('Workout saved!');
    }
  };

  const displayTime = new Date(elapsedMs).toISOString().slice(11, 19);

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full max-w-[300px] gap-6">
      
      <div className="flex flex-col items-center p-4 rounded-full border-4 border-bg-secondary bg-[#111] aspect-square justify-center w-48 shadow-[0_0_15px_rgba(255,100,50,0.3)] glow-effect">
        <span className="text-3xl font-mono font-bold tracking-wider">{displayTime}</span>
        <span className="text-xl text-text-secondary mt-1">{(location.distance / 1000).toFixed(2)} km</span>
        {pedometer.steps > 0 && <span className="text-md text-text-tertiary mt-1">{pedometer.steps} steps</span>}
      </div>

      <div className="flex gap-4 mt-2">
        {!location.isTracking ? (
          <button onClick={handleStart} className="p-5 bg-success text-white rounded-full active:scale-95 transition-transform hover:shadow-[0_0_15px_rgba(0,255,0,0.5)]">
            <Play size={36} className="fill-current" />
          </button>
        ) : (
          <>
            <button onClick={handlePause} className="p-4 bg-warning text-black rounded-full active:scale-95 transition-transform">
              {isPaused ? <Play size={28} className="fill-current" /> : <Pause size={28} className="fill-current" />}
            </button>
            <button onClick={handleStop} className="p-4 bg-danger text-white rounded-full active:scale-95 transition-transform hover:shadow-[0_0_15px_rgba(255,0,0,0.5)]">
              <Square size={28} className="fill-current" />
            </button>
          </>
        )}
      </div>

      {location.error && <p className="text-danger text-xs text-center">{location.error}</p>}
    </div>
  );
}
