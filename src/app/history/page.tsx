'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getWorkouts, getRuns, getRoutePoints, updateWorkoutEntries, deleteWorkout, deleteRun } from '@/lib/firestore';
import WorkoutList from '@/components/WorkoutList';
import MapView from '@/components/MapView';
import ConfirmDialog from '@/components/ConfirmDialog';
import { StaggeredList, SkeletonList } from '@/components/Skeleton';
import { ChevronDown, ChevronUp, Trash2, Route, Timer, Gauge } from 'lucide-react';
import type { Workout, WorkoutEntry, Run, RoutePoint } from '@/types';

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

function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [expandedWorkout, setExpandedWorkout] = useState<string | null>(null);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runRoutes, setRunRoutes] = useState<Record<string, RoutePoint[]>>({});
  const [loading, setLoading] = useState(true);

  // Confirm dialog state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'workout' | 'movement' | 'run';
    id: string;
    movementName?: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!user) return;
    Promise.all([getWorkouts(user.uid), getRuns(user.uid)]).then(([w, r]) => {
      setWorkouts(w);
      setRuns(r);
      setLoading(false);
    });
  }, [user]);

  // Load route when a run is expanded
  useEffect(() => {
    if (!user || !expandedRun || runRoutes[expandedRun]) return;
    getRoutePoints(user.uid, expandedRun).then((pts) => {
      setRunRoutes((prev) => ({ ...prev, [expandedRun]: pts }));
    });
  }, [user, expandedRun, runRoutes]);

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
    setConfirmModal({
      type: 'movement',
      id: workoutId,
      movementName,
      message: `Do you really want to delete all sets for "${movementName}" in this workout?`,
    });
  }, []);

  const handleDeleteWorkout = useCallback((workoutId: string) => {
    setConfirmModal({
      type: 'workout',
      id: workoutId,
      message: 'This will permanently delete the entire workout and all its sets.',
    });
  }, []);

  const handleDeleteRun = useCallback((runId: string) => {
    setConfirmModal({
      type: 'run',
      id: runId,
      message: 'This will permanently delete this run and its route data.',
    });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!user || !confirmModal) return;
    if (confirmModal.type === 'workout') {
      setWorkouts((prev) => prev.filter((w) => w.id !== confirmModal.id));
      await deleteWorkout(user.uid, confirmModal.id);
    } else if (confirmModal.type === 'movement' && confirmModal.movementName) {
      const w = workouts.find((w) => w.id === confirmModal.id);
      if (w) {
        const remaining = w.entries.filter((e) => e.movementName !== confirmModal.movementName);
        await handleUpdateEntries(confirmModal.id, remaining);
      }
    } else if (confirmModal.type === 'run') {
      setRuns((prev) => prev.filter((r) => r.id !== confirmModal.id));
      await deleteRun(user.uid, confirmModal.id);
    }
    setConfirmModal(null);
  }, [user, confirmModal, workouts, handleUpdateEntries]);

  // Group workouts by week
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
    <div className="pt-6 pb-20 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-4">History</h1>

      {/* ─── Runs Section ─────────────────────────────────── */}
      {runs.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-bold text-accent uppercase tracking-wider mb-3">Outdoor Activities</h2>
          <div className="space-y-3">
            {runs.map((run) => {
              const isExpanded = expandedRun === run.id;
              const avgSpeedKmh = run.duration > 0 ? ((run.distance / 1000) / (run.duration / 3600)).toFixed(1) : '0.0';
              return (
                <div key={run.id} className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow card-depth overflow-hidden">
                  <button
                    onClick={() => setExpandedRun(isExpanded ? null : run.id)}
                    className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Route size={16} className="text-accent" />
                        <span className="font-semibold text-text-primary">{relativeDate(run.date)}</span>
                        <span className="text-xs bg-success/10 text-success rounded-full px-2 py-0.5">
                          {(run.distance / 1000).toFixed(2)} km
                        </span>
                      </div>
                      <p className="text-text-tertiary text-xs mt-0.5">
                        {fmtTime(run.duration)} · {avgSpeedKmh} km/h avg
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRun(run.id); }}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 active:scale-90 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                      {isExpanded ? <ChevronUp size={18} className="text-text-tertiary" /> : <ChevronDown size={18} className="text-text-tertiary" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 animate-fade-in space-y-3">
                      <MapView route={runRoutes[run.id] || []} height="200px" />
                      <div className="grid grid-cols-3 gap-2 text-center text-sm">
                        <div className="bg-bg-tertiary/50 rounded-xl py-2">
                          <span className="block text-[10px] text-text-tertiary uppercase">Distance</span>
                          <span className="font-bold">{(run.distance / 1000).toFixed(2)} km</span>
                        </div>
                        <div className="bg-bg-tertiary/50 rounded-xl py-2">
                          <span className="block text-[10px] text-text-tertiary uppercase">Duration</span>
                          <span className="font-bold">{fmtTime(run.duration)}</span>
                        </div>
                        <div className="bg-bg-tertiary/50 rounded-xl py-2">
                          <span className="block text-[10px] text-text-tertiary uppercase">Avg Speed</span>
                          <span className="font-bold">{avgSpeedKmh} km/h</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Strength Workouts Section ────────────────────── */}
      {workouts.length === 0 && runs.length === 0 ? (
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
                  const isExpanded = expandedWorkout === w.id;
                  const movePreview = [...new Set(w.entries.map((e) => e.movementName))].slice(0, 3).join(', ');
                  return (
                    <div key={w.id} className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow card-depth overflow-hidden">
                      <button
                        onClick={() => setExpandedWorkout(isExpanded ? null : w.id)}
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

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmModal !== null}
        title="Are you sure?"
        message={confirmModal?.message || 'Do you really want to delete this item?'}
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setConfirmModal(null)}
      />
    </div>
  );
}
