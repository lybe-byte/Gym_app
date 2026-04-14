'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getWeeklyGoals, saveWeeklyGoals } from '@/lib/firestore';
import type { WeeklyGoals as GoalsType } from '@/types';
import { Target, Footprints, Flame, Route, Activity, Edit3, X, Check } from 'lucide-react';

interface GoalsPanelProps {
  currentDistance: number; // in meters
  currentSteps: number;
  currentCalories: number;
  currentWorkouts: number;
}

const defaultGoals: GoalsType = {
  distance: 20000, // 20 km
  steps: 50000,
  calories: 3000,
  workouts: 3,
};

export default function GoalsPanel({ currentDistance, currentSteps, currentCalories, currentWorkouts }: GoalsPanelProps) {
  const { user } = useAuth();
  const [goals, setGoals] = useState<GoalsType | null>(null);
  const [editing, setEditing] = useState(false);
  const [draftGoals, setDraftGoals] = useState<GoalsType>(defaultGoals);

  useEffect(() => {
    if (!user) return;
    getWeeklyGoals(user.uid).then(g => {
      if (g) {
        setGoals(g);
        setDraftGoals(g);
      } else {
        setGoals(defaultGoals); // Default UI fallback
      }
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    await saveWeeklyGoals(user.uid, draftGoals);
    setGoals(draftGoals);
    setEditing(false);
  };

  if (!goals) {
    return <div className="skeleton h-40 w-full rounded-2xl mb-4" />;
  }

  if (editing) {
    return (
      <div className="bg-bg-secondary rounded-2xl p-4 border border-accent/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] mb-6 animate-fade-in">
        <div className="flex items-center gap-2 mb-4">
          <Target size={20} className="text-accent" />
          <h2 className="font-bold text-lg">Edit Weekly Goals</h2>
        </div>

        <div className="space-y-4 text-sm">
          <div className="flex flex-col gap-1">
            <label className="text-text-tertiary">Distance (km)</label>
            <input 
              type="number" 
              value={draftGoals.distance / 1000} 
              onChange={e => setDraftGoals(g => ({ ...g, distance: Number(e.target.value) * 1000 }))}
              className="bg-bg-primary border border-border-color rounded-xl p-2.5 outline-none focus:border-accent w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-tertiary">Steps</label>
            <input 
              type="number" 
              value={draftGoals.steps} 
              onChange={e => setDraftGoals(g => ({ ...g, steps: Number(e.target.value) }))}
              className="bg-bg-primary border border-border-color rounded-xl p-2.5 outline-none focus:border-accent w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-tertiary">Calories</label>
            <input 
              type="number" 
              value={draftGoals.calories} 
              onChange={e => setDraftGoals(g => ({ ...g, calories: Number(e.target.value) }))}
              className="bg-bg-primary border border-border-color rounded-xl p-2.5 outline-none focus:border-accent w-full"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-text-tertiary">Workouts</label>
            <input 
              type="number" 
              value={draftGoals.workouts} 
              onChange={e => setDraftGoals(g => ({ ...g, workouts: Number(e.target.value) }))}
              className="bg-bg-primary border border-border-color rounded-xl p-2.5 outline-none focus:border-accent w-full"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button 
            onClick={() => setEditing(false)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-bg-tertiary text-text-primary hover:bg-border-color active:scale-95 transition-all"
          >
            <X size={16} /> Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white hover:opacity-90 active:scale-95 transition-all"
          >
            <Check size={16} /> Save
          </button>
        </div>
      </div>
    );
  }

  const distKm = currentDistance / 1000;
  const goalDistKm = goals.distance / 1000;

  return (
    <div className="bg-bg-secondary rounded-2xl p-4 border border-border-color shadow-card-shadow mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={20} className="text-accent" />
          <h2 className="font-bold text-lg">Weekly Goals</h2>
        </div>
        <button 
          onClick={() => setEditing(true)}
          className="p-1.5 text-text-tertiary hover:bg-bg-tertiary rounded-lg transition-all"
        >
          <Edit3 size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <ProgressBar label="Distance" current={distKm} max={goalDistKm} icon={<Route size={14} />} unit="km" colorClass="bg-accent" />
        <ProgressBar label="Steps" current={currentSteps} max={goals.steps} icon={<Footprints size={14} />} unit="" colorClass="bg-success" />
        <ProgressBar label="Calories" current={currentCalories} max={goals.calories} icon={<Flame size={14} />} unit="kcal" colorClass="bg-warning" />
        <ProgressBar label="Workouts" current={currentWorkouts} max={goals.workouts} icon={<Activity size={14} />} unit="" colorClass="bg-info" />
      </div>
    </div>
  );
}

function ProgressBar({ label, current, max, icon, unit, colorClass }: any) {
  const pct = Math.min((current / max) * 100, 100) || 0;
  const isDone = pct >= 100;

  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="flex items-center gap-1.5 text-text-secondary font-medium">
          <span className={colorClass.replace('bg-', 'text-')}>{icon}</span> {label}
        </span>
        <span className="text-text-tertiary">
          <strong className={`font-bold ${isDone ? 'text-success' : 'text-text-primary'}`}>
            {typeof current === 'number' && Number.isInteger(current) ? current.toLocaleString() : current.toFixed(1)}
          </strong>
          {' '} / {max.toLocaleString()} {unit}
        </span>
      </div>
      <div className="h-2 w-full bg-bg-primary rounded-full overflow-hidden border border-bg-tertiary/50">
        <div 
          style={{ width: `${pct}%` }} 
          className={`h-full rounded-full transition-all duration-1000 ${isDone ? 'bg-success' : colorClass}`}
        />
      </div>
    </div>
  );
}
