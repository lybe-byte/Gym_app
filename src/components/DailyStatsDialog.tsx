'use client';

import { useMemo } from 'react';
import type { StepData, Run } from '@/types';
import { X, Footprints, Flame, Route } from 'lucide-react';

interface DailyStatsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  metric: 'steps' | 'distance' | 'calories' | null;
  stepsData: StepData[];
  runsData: Run[];
}

export default function DailyStatsDialog({ isOpen, onClose, metric, stepsData, runsData }: DailyStatsDialogProps) {
  const chartData = useMemo(() => {
    if (!metric) return [];

    // Generate strings for the last 7 days
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    return last7Days.map((dateObj) => {
      const dateStr = dateObj.toISOString().slice(0, 10);
      const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue, etc.

      let value = 0;
      if (metric === 'steps') {
        value = stepsData.find((s) => s.date === dateStr)?.steps || 0;
      } else if (metric === 'calories') {
        value = stepsData.find((s) => s.date === dateStr)?.calories || 0;
      } else if (metric === 'distance') {
        // Runs are createdAt full string, match start
        value = runsData
          .filter((r) => new Date(r.createdAt).toISOString().slice(0, 10) === dateStr)
          .reduce((sum, r) => sum + r.distance, 0) / 1000; // in km
      }

      return { dateStr, weekday, value };
    });
  }, [metric, stepsData, runsData]);

  if (!isOpen || !metric) return null;

  // Chart configuration
  const maxVal = Math.max(...chartData.map(d => d.value), 1); // prevent divide by zero
  const isDistance = metric === 'distance';
  
  const metricConfig = {
    steps: { label: 'Steps', icon: <Footprints size={20} className="text-accent" />, color: 'bg-accent' },
    distance: { label: 'Distance', icon: <Route size={20} className="text-success" />, color: 'bg-success' },
    calories: { label: 'Calories', icon: <Flame size={20} className="text-warning" />, color: 'bg-warning' },
  };

  const config = metricConfig[metric];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary/80 backdrop-blur-sm animate-fade-in print:hidden p-4">
      <div 
        className="bg-bg-secondary w-full max-w-md rounded-2xl p-6 border border-border-color shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-slide-up"
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl bg-bg-tertiary`}>
              {config.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">{config.label}</h2>
              <p className="text-sm text-text-tertiary">Last 7 Days</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-text-tertiary hover:bg-bg-tertiary rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Bar Chart Area */}
        <div className="h-48 flex items-end justify-between gap-2 mt-4 select-none">
          {chartData.map((day, idx) => {
            const heightPct = Math.max((day.value / maxVal) * 100, 2); // 2% minimum tiny bar
            return (
              <div key={day.dateStr} className="flex-1 flex flex-col items-center justify-end gap-2 group relative">
                {/* Tooltip on hover/active */}
                <span className="absolute -top-7 px-2 py-0.5 rounded-md bg-bg-tertiary text-xs font-bold text-text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  {isDistance ? day.value.toFixed(1) : day.value.toLocaleString()}
                </span>

                {/* Progress Bar Container */}
                <div className="w-full h-full bg-bg-primary rounded-t-md rounded-b-sm flex items-end overflow-hidden group-hover:bg-bg-tertiary/50 transition-colors">
                  <div 
                    className={`w-full rounded-t-md rounded-b-sm transition-all duration-700 ease-out ${config.color} ${idx === 6 ? 'opacity-100' : 'opacity-70'}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                
                {/* Weekday Label */}
                <span className={`text-[10px] font-semibold w-full text-center ${idx === 6 ? 'text-text-primary' : 'text-text-tertiary'}`}>
                  {day.weekday}
                </span>
              </div>
            );
          })}
        </div>

        {/* Display Total summary under chart */}
        <div className="mt-6 pt-4 border-t border-border-color grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-text-tertiary mb-1">Weekly Total</p>
            <p className="font-bold text-lg text-text-primary">
              {isDistance 
                ? chartData.reduce((s, d) => s + d.value, 0).toFixed(1) + ' km'
                : chartData.reduce((s, d) => s + d.value, 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary mb-1">Daily Average</p>
            <p className="font-bold text-lg text-text-primary">
              {isDistance 
                ? (chartData.reduce((s, d) => s + d.value, 0) / 7).toFixed(1) + ' km'
                : Math.round(chartData.reduce((s, d) => s + d.value, 0) / 7).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
