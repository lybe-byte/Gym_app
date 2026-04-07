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
} from '@/lib/firestore';
import { getWorkouts } from '@/lib/firestore';
import WorkoutForm from '@/components/WorkoutForm';
import WorkoutList from '@/components/WorkoutList';
import { SkeletonList } from '@/components/Skeleton';
import { CheckCircle, Trophy } from 'lucide-react';
import type { Workout, WorkoutEntry, Movement } from '@/types';

export default function HomePage() {
  const { user } = useAuth();
  const { unit } = useSettings();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [finishState, setFinishState] = useState<'idle' | 'confirm' | 'done'>('idle');
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [w, m] = await Promise.all([
        getWorkoutByDate(user.uid, todayDateString()),
        getMovements(user.uid),
      ]);
      setWorkout(w);
      setMovements(m);
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
        // Lazy creation
        const newWorkout: Omit<Workout, 'id'> = {
          date: todayDateString(),
          entries: [entry],
          createdAt: Date.now(),
          completed: false,
        };
        const id = await createWorkout(user.uid, newWorkout);
        setWorkout({ id, ...newWorkout });
      } else {
        // Optimistic update
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
      // Optimistic
      setWorkout((prev) => prev ? { ...prev, entries: remaining } : prev);
      showToast(`Removed ${movementName}`, () => {
        // Undo: restore entries
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

  return (
    <div className="pt-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-1">Today&apos;s Workout</h1>
      <p className="text-text-tertiary text-sm mb-4">
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>

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
