'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getWorkouts, updateWorkoutEntries, deleteWorkout } from '@/lib/firestore';
import WorkoutList from '@/components/WorkoutList';
import { StaggeredList, SkeletonList } from '@/components/Skeleton';
import { ChevronDown, ChevronUp, Trash2, X } from 'lucide-react';
import type { Workout, WorkoutEntry } from '@/types';

function getWeekKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  const day = d.getDay();
  const sun = new Date(d);
  sun.setDate(d.getDate() - day);
  const sat = new Date(sun);
  sat.setDate(sun.getDate() + 6);
  const fmt = (dt: Date) => dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `Week of ${fmt(sun)} — ${fmt(sat)}`;
}

function relativeDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [modal, setModal] = useState<{ type: 'movement' | 'workout'; workoutId: string; movementName?: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    getWorkouts(user.uid).then((w) => { setWorkouts(w); setLoading(false); });
  }, [user]);

  const handleUpdateEntries = useCallback(
    async (workoutId: string, entries: WorkoutEntry[]) => {
      if (!user) return;
      if (entries.length === 0) {
        setWorkouts((prev) => prev.filter((w) => w.id !== workoutId));
        await deleteWorkout(user.uid, workoutId);
      } else {
        setWorkouts((prev) => prev.map((w) => w.id === workoutId ? { ...w, entries } : w));
        await updateWorkoutEntries(user.uid, workoutId, entries);
      }
    },
    [user]
  );

  const handleDeleteMovement = useCallback((workoutId: string, movementName: string) => {
    setModal({ type: 'movement', workoutId, movementName });
  }, []);

  const handleDeleteWorkout = useCallback((workoutId: string) => {
    setModal({ type: 'workout', workoutId });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!user || !modal) return;
    if (modal.type === 'workout') {
      setWorkouts((prev) => prev.filter((w) => w.id !== modal.workoutId));
      await deleteWorkout(user.uid, modal.workoutId);
    } else if (modal.type === 'movement' && modal.movementName) {
      const w = workouts.find((w) => w.id === modal.workoutId);
      if (w) {
        const remaining = w.entries.filter((e) => e.movementName !== modal.movementName);
        await handleUpdateEntries(modal.workoutId, remaining);
      }
    }
    setModal(null);
  }, [user, modal, workouts, handleUpdateEntries]);

  // Group by week
  const grouped: Record<string, Workout[]> = {};
  workouts.forEach((w) => {
    const key = getWeekKey(w.date);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(w);
  });

  if (loading) {
    return (
      <div className="pt-6">
        <div className="skeleton h-8 w-40 rounded-lg mb-4" />
        <SkeletonList count={4} />
      </div>
    );
  }

  return (
    <div className="pt-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-4">History</h1>

      {workouts.length === 0 ? (
        <div className="text-center py-16 text-text-tertiary">
          <p className="text-lg">No workouts yet</p>
          <p className="text-sm mt-1">Start logging sets to see your history here</p>
        </div>
      ) : (
        Object.entries(grouped).map(([week, wks]) => (
          <div key={week} className="mb-6">
            <h2 className="text-sm font-bold text-accent uppercase tracking-wider mb-3">{week}</h2>
            <div className="space-y-3">
              <StaggeredList>
                {wks.map((w) => {
                  const isExpanded = expanded === w.id;
                  const movePreview = [...new Set(w.entries.map((e) => e.movementName))].slice(0, 3).join(', ');
                  return (
                    <div key={w.id} className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow card-depth overflow-hidden">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : w.id)}
                        className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-text-primary">{relativeDate(w.date)}</span>
                            <span className="text-xs bg-accent/10 text-accent rounded-full px-2 py-0.5">{w.entries.length} sets</span>
                          </div>
                          <p className="text-text-tertiary text-xs truncate mt-0.5">{movePreview}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteWorkout(w.id); }}
                            className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 active:scale-90 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                          {isExpanded ? <ChevronUp size={18} className="text-text-tertiary" /> : <ChevronDown size={18} className="text-text-tertiary" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-4 pb-4 animate-fade-in">
                          <WorkoutList
                            entries={w.entries}
                            onUpdate={(entries) => handleUpdateEntries(w.id, entries)}
                            onDeleteMovement={(name) => handleDeleteMovement(w.id, name)}
                            showUndoOnDelete={false}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </StaggeredList>
            </div>
          </div>
        ))
      )}

      {/* Confirmation Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)}>
          <div className="bg-bg-secondary rounded-2xl p-6 m-4 max-w-sm w-full shadow-card-shadow-lg border border-border-color animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-text-primary">
                Delete {modal.type === 'workout' ? 'Workout' : 'Movement'}?
              </h3>
              <button onClick={() => setModal(null)} className="p-1 text-text-tertiary hover:text-text-primary"><X size={20} /></button>
            </div>
            <p className="text-text-secondary text-sm mb-6">
              {modal.type === 'workout'
                ? 'This will permanently delete the entire workout and all its sets.'
                : `This will permanently delete all sets for "${modal.movementName}" in this workout.`}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-xl bg-bg-tertiary text-text-primary font-semibold hover:bg-border-color active:scale-[0.98] transition-all">Cancel</button>
              <button onClick={confirmDelete} className="flex-1 py-3 rounded-xl bg-danger text-white font-semibold hover:bg-danger-hover active:scale-[0.98] transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
