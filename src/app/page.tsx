'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  getRoutePoints,
  deleteRun,
  getWorkouts,
} from '@/lib/firestore';
import WorkoutForm from '@/components/WorkoutForm';
import WorkoutList from '@/components/WorkoutList';
import MapView from '@/components/MapView';
import OutdoorTracker from '@/components/OutdoorTracker';
import GoalsPanel from '@/components/GoalsPanel';
import HeatmapView from '@/components/HeatmapView';
import DailyStatsDialog from '@/components/DailyStatsDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SkeletonList } from '@/components/Skeleton';
import {
  CheckCircle, Trophy, Activity, Footprints, Flame,
  Maximize2, Trash2, ExternalLink, Map as MapIcon,
} from 'lucide-react';
import type { Workout, WorkoutEntry, Movement, Run, StepData, RoutePoint } from '@/types';

export default function HomePage() {
  const { user } = useAuth();
  const { unit } = useSettings();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [steps, setSteps] = useState<StepData[]>([]);
  const [latestRoute, setLatestRoute] = useState<RoutePoint[]>([]);
  const [heatmapRoute, setHeatmapRoute] = useState<RoutePoint[]>([]);
  const [weeklyWorkoutsCount, setWeeklyWorkoutsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [finishState, setFinishState] = useState<'idle' | 'confirm' | 'done'>('idle');
  const [toast, setToast] = useState<{ message: string; undo?: () => void } | null>(null);

  // Latest run & heatmap logic
  const [mapExpanded, setMapExpanded] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [confirmDeleteRun, setConfirmDeleteRun] = useState(false);
  const [activeMetric, setActiveMetric] = useState<'steps' | 'distance' | 'calories' | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartStr = weekStart.toISOString().slice(0, 10);

      const [w, m, r, s, allW] = await Promise.all([
        getWorkoutByDate(user.uid, todayDateString()),
        getMovements(user.uid),
        getRuns(user.uid),
        getWeeklyStepData(user.uid, weekStartStr, todayDateString()),
        getWorkouts(user.uid),
      ]);
      setWorkout(w);
      setMovements(m);
      setRuns(r);
      setSteps(s);

      // Filter workouts within the last 7 days for the goals counter
      const recentW = allW.filter((workout) => workout.date >= weekStartStr);
      setWeeklyWorkoutsCount(recentW.length);

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
        setWorkout((prev) => (prev ? { ...prev, entries: [...prev.entries, entry] } : prev));
        await addEntryToWorkout(user.uid, workout.id, entry);
      }
    },
    [user, workout],
  );

  const handleUpdateEntries = useCallback(
    async (entries: WorkoutEntry[]) => {
      if (!user || !workout) return;
      setWorkout((prev) => (prev ? { ...prev, entries } : prev));
      await updateWorkoutEntries(user.uid, workout.id, entries);
      if (entries.length === 0) {
        setWorkout(null);
      }
    },
    [user, workout],
  );

  const handleDeleteMovement = useCallback(
    (movementName: string) => {
      if (!workout) return;
      const removed = workout.entries.filter((e) => e.movementName === movementName);
      const remaining = workout.entries.filter((e) => e.movementName !== movementName);
      setWorkout((prev) => (prev ? { ...prev, entries: remaining } : prev));
      showToast(`Removed ${movementName}`, () => {
        setWorkout((prev) =>
          prev ? { ...prev, entries: [...prev.entries, ...removed] } : prev,
        );
        if (user && workout) {
          updateWorkoutEntries(user.uid, workout.id, [...remaining, ...removed]);
        }
      });
      if (user) {
        updateWorkoutEntries(user.uid, workout.id, remaining);
      }
    },
    [workout, user, showToast],
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

  const handleDeleteLatestRun = useCallback(async () => {
    if (!user || runs.length === 0) return;
    const runId = runs[0].id;
    setRuns((prev) => prev.filter((r) => r.id !== runId));
    setLatestRoute([]);
    setConfirmDeleteRun(false);
    setMapExpanded(false);
    await deleteRun(user.uid, runId);
    showToast('Run deleted');
  }, [user, runs, showToast]);

  const lastEntry = workout?.entries?.length ? workout.entries[workout.entries.length - 1] : null;

  /* ── Loading skeleton ─────────────────────────────────── */
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
  const latestRun = runs.length > 0 ? runs[0] : null;

  return (
    <div className="pt-6 pb-20 animate-fade-in flex flex-col gap-6">
      {/* ─── Weekly Summary & Goals ───────────────────────── */}
      <section>
        <GoalsPanel 
          currentDistance={weeklyDistance * 1000} 
          currentSteps={weeklySteps} 
          currentCalories={weeklyCalories} 
          currentWorkouts={weeklyWorkoutsCount} 
        />
        
        <h2 className="text-xl font-bold text-text-primary mb-3">Last 7 Days</h2>
        <div className="grid grid-cols-3 gap-3">
          <SummaryCard 
            icon={<Footprints size={22} />} 
            label="Steps" 
            value={weeklySteps.toLocaleString()} 
            color="text-accent" 
            onClick={() => setActiveMetric('steps')}
          />
          <SummaryCard 
            icon={<Activity size={22} />} 
            label="Distance" 
            value={`${weeklyDistance.toFixed(1)} km`} 
            color="text-success" 
            onClick={() => setActiveMetric('distance')}
          />
          <SummaryCard 
            icon={<Flame size={22} />} 
            label="Calories" 
            value={weeklyCalories.toLocaleString()} 
            color="text-warning" 
            onClick={() => setActiveMetric('calories')}
          />
        </div>
      </section>

      {/* ─── Activity Map Preview ─────────────────────────── */}
      {(latestRun || showHeatmap) && (
        <section>
          <div className="flex justify-between items-end mb-3">
            <h2 className="text-xl font-bold text-text-primary">
              {showHeatmap ? 'Personal Heatmap' : 'Latest Run'}
            </h2>
            <div className="flex bg-bg-secondary p-1 rounded-lg border border-border-color shadow-sm">
              <button
                onClick={() => setShowHeatmap(false)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${!showHeatmap ? 'bg-accent text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
              >
                Latest
              </button>
              <button
                onClick={() => setShowHeatmap(true)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${showHeatmap ? 'bg-info text-white shadow-sm' : 'text-text-tertiary hover:text-text-primary'}`}
              >
                Heatmap
              </button>
            </div>
          </div>

          <div className="bg-bg-secondary rounded-2xl border border-border-color shadow-card-shadow overflow-hidden">
            {/* Map — toggle between latest route and heatmap */}
            {!showHeatmap && latestRun ? (
              <MapView route={latestRoute} height={mapExpanded ? '350px' : '160px'} />
            ) : showHeatmap ? (
              <HeatmapView height={mapExpanded ? '350px' : '160px'} />
            ) : null}

            {/* Stats bar */}
            {!showHeatmap && latestRun && (
              <div className="flex items-center justify-between px-4 py-3 text-sm flex-wrap gap-2">
                <div className="flex gap-4 text-text-secondary">
                  <span className="font-semibold">{(latestRun.distance / 1000).toFixed(2)} km</span>
                  <span>
                    {Math.floor(latestRun.duration / 60)}:{(latestRun.duration % 60).toString().padStart(2, '0')}
                  </span>
                  {latestRun.duration > 0 && (
                    <span className="text-text-tertiary">
                      {((latestRun.distance / 1000) / (latestRun.duration / 3600)).toFixed(1)} km/h
                    </span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => router.push('/history')}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 active:scale-90 transition-all"
                    title="View in History"
                  >
                    <ExternalLink size={16} />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteRun(true)}
                    className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 active:scale-90 transition-all"
                    title="Delete run"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex justify-end px-4 py-2 border-t border-border-color/50">
              <button
                onClick={() => setMapExpanded((e) => !e)}
                className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-semibold rounded-lg text-text-tertiary hover:text-info hover:bg-info/10 transition-all"
              >
                <Maximize2 size={14} /> {mapExpanded ? 'Collapse' : 'Expand View'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ─── Outdoor Tracking (inline) ────────────────────── */}
      <section>
        <h2 className="text-xl font-bold text-text-primary mb-3">Outdoor Activity</h2>
        <OutdoorTracker />
      </section>

      {/* ─── Strength Training ────────────────────────────── */}
      <section>
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-text-primary mb-1">Today&apos;s Workout</h1>
          <p className="text-text-tertiary text-sm">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <WorkoutForm movements={movements} lastEntry={lastEntry} unit={unit} onLog={handleLog} />

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
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle size={20} /> Done!
                </span>
              ) : finishState === 'confirm' ? (
                'Tap again to confirm'
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Trophy size={20} /> Finish Workout
                </span>
              )}
            </button>
          </>
        )}
      </section>

      {/* ─── Delete Run Confirmation ──────────────────────── */}
      <ConfirmDialog
        open={confirmDeleteRun}
        title="Are you sure?"
        message="Do you really want to delete this run? The route data will be permanently removed."
        confirmLabel="Delete"
        onConfirm={handleDeleteLatestRun}
        onCancel={() => setConfirmDeleteRun(false)}
      />

      {/* ─── Toast ────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
          <div className="bg-bg-secondary border border-border-color rounded-xl px-5 py-3 shadow-card-shadow-lg flex items-center gap-3">
            <span className="text-text-primary text-sm">{toast.message}</span>
            {toast.undo && (
              <button
                onClick={() => {
                  toast.undo?.();
                  setToast(null);
                }}
                className="text-accent font-semibold text-sm hover:underline"
              >
                Undo
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Daily Breakdowns Dialog ──────────────────────── */}
      <DailyStatsDialog 
        isOpen={activeMetric !== null}
        onClose={() => setActiveMetric(null)}
        metric={activeMetric}
        stepsData={steps}
        runsData={runs}
      />
    </div>
  );
}

/* ── Reusable summary card ──────────────────────────────── */
function SummaryCard({
  icon,
  label,
  value,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`bg-bg-secondary p-3 rounded-2xl border border-border-color flex flex-col justify-center items-center gap-1 shadow-card-shadow relative overflow-hidden group w-full text-center transition-all ${onClick ? 'hover:bg-bg-tertiary/50 hover:scale-[1.02] active:scale-[0.98]' : ''}`}
    >
      <span className={`${color} mb-0.5 group-hover:scale-110 transition-transform`}>{icon}</span>
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="font-bold text-lg">{value}</span>
    </button>
  );
}
