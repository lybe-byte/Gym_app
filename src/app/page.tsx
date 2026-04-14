'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  getWorkoutByDate,
  createWorkout,
  addEntryToWorkout,
  updateWorkoutEntries,
  completeWorkout,
  getMovements,
  todayDateString,
  generateId,
  getRuns,
  getWeeklyStepData,
  getRoutePoints
} from '@/lib/firestore';
import WorkoutForm from '@/components/WorkoutForm';
import WorkoutList from '@/components/WorkoutList';
import MapView from '@/components/MapView';
import { SkeletonList } from '@/components/Skeleton';
import { CheckCircle, Trophy, Activity, Footprints, Flame } from 'lucide-react';
import type { Workout, WorkoutEntry, Movement, Run, StepData, RoutePoint } from '@/types';

export default function HomePage() {
  const { user } = useAuth();
  const { unit } = useSettings();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [latestRoute, setLatestRoute] = useState<RoutePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishState, setFinishState] = useState<'idle' | 'confirm' | 'done'>('idle');
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().slice(0, 10);

      const [w, m, r, s] = await Promise.all([
        getWorkoutByDate(user.uid, todayDateString()),
        getMovements(user.uid),
        getRuns(user.uid),
        getWeeklyStepData(user.uid, weekStartStr, todayDateString())
      ]);
      setWorkout(w);
      setMovements(m);
      setRuns(r);
      setSteps(s);

      if (r.length > 0) {
        const pts = await getRoutePoints(user.uid, r[0].id);
        setLatestRoute(pts);
      }

      setLoading(false);
    };
    load();
  }, [user]);

  const showToast = useCallback((message: string, undo?: () => void) => {
    setToast({ message, undo });
    setTimeout(() => setToast(null), 5000);
  }, []);

  const handleLog = useCallback(
    async (movementName: string, reps: number, weight: number, entryUnit: string, notes: string) => {
      if (!user) return;
      const entry: WorkoutEntry = {
        id: generateId(),
        movementName,
        reps,
        weight,
        unit: entryUnit as 'kg' | 'lbs',
        notes,
        createdAt: Date.now(),
      };

      if (!workout) {
        const newWorkout: Omit<Workout, 'id'> = {
          date: todayDateString(),
          entries: [entry],
          createdAt: Date.now(),
          completed: false,
        };
        const id = await createWorkout(user.uid, newWorkout);
        setWorkout({ id, ...newWorkout });
      } else {
        setWorkout((prev) => prev ? { ...prev, entries: [...prev.entries, entry] } : prev);
        await addEntryToWorkout(user.uid, workout.id, entry);
      }
    },
    [user, workout]
  );

  const handleUpdateEntries = useCallback(
    async (entries: WorkoutEntry[]) => {
      if (!user || !workout) return;
      setWorkout((prev) => prev ? { ...prev, entries } : prev);
      await updateWorkoutEntries(user.uid, workout.id, entries);
      if (entries.length === 0) {
        setWorkout(null);
      }
    },
    [user, workout]
  );

  const handleDeleteMovement = useCallback(
    (movementName: string) => {
      if (!workout) return;
      const removed = workout.entries.filter((e) => e.movementName === movementName);
      const remaining = workout.entries.filter((e) => e.movementName !== movementName);
      setWorkout((prev) => prev ? { ...prev, entries: remaining } : prev);
      showToast(`Removed ${movementName}`, () => {
        setWorkout((prev) =>
          prev ? { ...prev, entries: [...prev.entries, ...removed] } : prev
        );
        if (user && workout) {
          updateWorkoutEntries(user.uid, workout.id, [...remaining, ...removed]);
        }
      });
      if (user) {
        updateWorkoutEntries(user.uid, workout.id, remaining);
      }
    },
    [workout, user, showToast]
  );

  const handleFinish = useCallback(async () => {
    if (finishState === 'idle') {
      setFinishState('confirm');
      setTimeout(() => setFinishState('idle'), 3000);
      return;
    }
    if (finishState === 'confirm' && user && workout) {
      await completeWorkout(user.uid, workout.id);
      setFinishState('done');
      const totalSets = workout.entries.length;
      const totalVol = workout.entries.reduce((s, e) => s + e.reps * e.weight, 0);
      showToast(`Workout done! ${totalSets} sets · ${totalVol.toLocaleString()} ${unit} total`);
      setTimeout(() => {
        setWorkout(null);
        setFinishState('idle');
      }, 2000);
    }
  }, [finishState, user, workout, unit, showToast]);

  const lastEntry = workout?.entries?.length ? workout.entries[workout.entries.length - 1] : null;

  if (loading) {
    return (
      <div className="pt-6">
        <div className="skeleton h-8 w-48 rounded-lg mb-4" />
        <div className="skeleton h-48 rounded-2xl mb-4" />
        <SkeletonList count={3} />
      </div>
    );
  }

  const weeklySteps = steps.reduce((sum, s) => sum + s.steps, 0);
  const weeklyDistance = runs.reduce((sum, r) => sum + r.distance, 0) / 1000;
  const weeklyCalories = steps.reduce((sum, s) => sum + (s.calories || 0), 0);

  return (
    <div className="pt-6 pb-20 animate-fade-in flex flex-col gap-8">
      
      {/* ─── Health Summary ─── */}
      <section>
        <h2 className="text-xl font-bold text-text-primary mb-3">Weekly Summary</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-bg-secondary p-3 rounded-2xl border border-border-color flex flex-col justify-center items-center gap-1 shadow-card-shadow">
            <Footprints className="text-accent mb-1" size={24} />
            <span className="text-xs text-text-tertiary">Steps</span>
            <span className="font-bold text-lg">{weeklySteps.toLocaleString()}</span>
          </div>
          <div className="bg-bg-secondary p-3 rounded-2xl border border-border-color flex flex-col justify-center items-center gap-1 shadow-card-shadow">
            <Activity className="text-success mb-1" size={24} />
            <span className="text-xs text-text-tertiary">Distance</span>
            <span className="font-bold text-lg">{weeklyDistance.toFixed(1)} km</span>
          </div>
          <div className="bg-bg-secondary p-3 rounded-2xl border border-border-color flex flex-col justify-center items-center gap-1 shadow-card-shadow">
            <Flame className="text-warning mb-1" size={24} />
            <span className="text-xs text-text-tertiary">Calories</span>
            <span className="font-bold text-lg">{weeklyCalories.toLocaleString()}</span>
          </div>
        </div>
      </section>

      {/* ─── Latest Activity ─── */}
      {runs.length > 0 && (
        <section>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-xl font-bold text-text-primary">Latest Run</h2>
            <span className="text-sm text-text-tertiary">{new Date(runs[0].createdAt).toLocaleDateString()}</span>
          </div>
          <MapView route={latestRoute} height="180px" />
          <div className="flex justify-between px-2 mt-2">
            <span className="text-sm text-text-secondary">{(runs[0].distance / 1000).toFixed(2)} km</span>
            <span className="text-sm text-text-secondary">{Math.floor(runs[0].duration / 60)}:{(runs[0].duration % 60).toString().padStart(2, '0')}</span>
          </div>
        </section>
      )}

      {/* ─── Strength Training ─── */}
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Today&apos;s Workout</h1>
          <p className="text-text-tertiary text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <WorkoutForm
          movements={movements}
          lastEntry={lastEntry}
          unit={unit}
          onLog={handleLog}
        />

        {workout && workout.entries.length > 0 && (
          <>
            <WorkoutList
              entries={workout.entries}
              onUpdate={handleUpdateEntries}
              onDeleteMovement={handleDeleteMovement}
            />

            <button
              onClick={handleFinish}
              className={`w-full mt-6 py-4 rounded-xl font-bold text-lg transition-all active:scale-[0.98] ${
                finishState === 'done'
                  ? 'bg-success text-white'
                  : finishState === 'confirm'
                  ? 'bg-warning text-black animate-glow-pulse'
                  : 'bg-bg-secondary text-text-primary border border-border-color hover:border-accent shadow-card-shadow'
              }`}
            >
              {finishState === 'done' ? (
                <span className="flex items-center justify-center gap-2"><CheckCircle size={20} /> Done!</span>
              ) : finishState === 'confirm' ? (
                'Tap again to confirm'
              ) : (
                <span className="flex items-center justify-center gap-2"><Trophy size={20} /> Finish Workout</span>
              )}
            </button>
          </>
        )}
      </section>

      {/* Undo toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-bg-secondary border border-border-color rounded-xl px-5 py-3 shadow-card-shadow-lg flex items-center gap-3">
            <span className="text-text-primary text-sm">{toast.message}</span>
            {toast.undo && (
              <button
                onClick={() => { toast.undo?.(); setToast(null); }}
                className="text-accent font-semibold text-sm hover:underline"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
