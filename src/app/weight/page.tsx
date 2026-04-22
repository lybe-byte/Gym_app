'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { getWeightLogs, saveWeightLog, todayDateString, generateId } from '@/lib/firestore';
import { 
  TrendingUp, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  History,
  Scale,
  Calendar
} from 'lucide-react';
import type { WeightLog } from '@/types';

type Period = 'daily' | 'weekly' | 'monthly';

export default function WeightPage() {
  const { user } = useAuth();
  const { unit } = useSettings();
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWeight, setNewWeight] = useState<string>('');
  const [period, setPeriod] = useState<Period>('daily');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const data = await getWeightLogs(user.uid);
      setLogs(data);
      setLoading(false);
      
      // Pre-fill input if there's a log for today
      const today = todayDateString();
      const todayLog = data.find(l => l.date === today);
      if (todayLog) setNewWeight(todayLog.weight.toString());
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user || !newWeight || saving) return;
    setSaving(true);
    const weightVal = parseFloat(newWeight);
    if (isNaN(weightVal)) {
      setSaving(false);
      return;
    }

    const log: WeightLog = {
      id: generateId(),
      date: todayDateString(),
      weight: weightVal,
      unit: unit,
      createdAt: Date.now()
    };

    await saveWeightLog(user.uid, log);
    
    // Update local state
    setLogs(prev => {
      const filtered = prev.filter(l => l.date !== log.date);
      return [log, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
    setSaving(false);
  };

  const chartData = useMemo(() => {
    if (logs.length === 0) return [];

    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    
    if (period === 'daily') {
      // Last 14 days
      const days: { label: string; value: number | null }[] = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const log = sorted.find(l => l.date === dateStr);
        days.push({
          label: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
          value: log ? log.weight : null
        });
      }
      return days;
    } else if (period === 'weekly') {
      // Last 8 weeks
      const weeks: { label: string; value: number | null }[] = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - (i * 7));
        // Get start of week (Sunday)
        const day = d.getDay();
        const diff = d.getDate() - day;
        const weekStart = new Date(d.setDate(diff));
        const weekEnd = new Date(new Date(weekStart).setDate(weekStart.getDate() + 6));
        
        const weekStartStr = weekStart.toISOString().slice(0, 10);
        const weekEndStr = weekEnd.toISOString().slice(0, 10);
        
        const LogsInWeek = sorted.filter(l => l.date >= weekStartStr && l.date <= weekEndStr);
        const avg = LogsInWeek.length > 0 
          ? LogsInWeek.reduce((s, l) => s + l.weight, 0) / LogsInWeek.length 
          : null;
          
        weeks.push({
          label: `W${8-i}`,
          value: avg
        });
      }
      return weeks;
    } else {
      // Monthly (Last 6 months)
      const months: { label: string; value: number | null }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthLabel = d.toLocaleDateString('en-US', { month: 'short' });
        const yearMonth = d.toISOString().slice(0, 7);
        
        const LogsInMonth = sorted.filter(l => l.date.startsWith(yearMonth));
        const avg = LogsInMonth.length > 0 
          ? LogsInMonth.reduce((s, l) => s + l.weight, 0) / LogsInMonth.length 
          : null;
          
        months.push({
          label: monthLabel,
          value: avg
        });
      }
      return months;
    }
  }, [logs, period]);

  // Find min/max for chart scaling
  const { min, max } = useMemo(() => {
    const values = chartData.map(d => d.value).filter(v => v !== null) as number[];
    if (values.length === 0) return { min: 0, max: 100 };
    const realMin = Math.min(...values);
    const realMax = Math.max(...values);
    const range = realMax - realMin;
    return {
      min: Math.floor(realMin - (range * 0.2 || 5)),
      max: Math.ceil(realMax + (range * 0.2 || 5))
    };
  }, [chartData]);

  if (loading) {
    return (
      <div className="pt-6 px-4">
        <div className="skeleton h-8 w-48 rounded-lg mb-6" />
        <div className="skeleton h-32 rounded-2xl mb-6" />
        <div className="skeleton h-64 rounded-2xl mb-6" />
      </div>
    );
  }

  return (
    <div className="pt-6 pb-24 px-4 animate-fade-in flex flex-col gap-6 max-w-lg mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Weight Progress</h1>
          <p className="text-sm text-text-tertiary">Track your body transformation</p>
        </div>
        <div className="p-3 rounded-2xl bg-bg-accent text-accent shadow-sm">
          <TrendingUp size={24} />
        </div>
      </header>

      {/* Log Weight Card */}
      <section className="bg-bg-secondary rounded-3xl border border-border-color shadow-card-shadow p-6 card-depth">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
            <Scale size={20} />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Log Today's Weight</h2>
        </div>
        
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              step="0.1"
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder="0.0"
              className="w-full bg-bg-tertiary border border-border-color rounded-2xl px-5 py-4 text-xl font-bold text-text-primary focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 font-bold text-text-secondary uppercase">
              {unit}
            </span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !newWeight}
            className="bg-accent text-text-on-accent px-6 rounded-2xl font-bold active:scale-95 disabled:opacity-50 transition-all shadow-btn-shadow flex items-center justify-center"
          >
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={24} />}
          </button>
        </div>
      </section>

      {/* Progress Chart Card */}
      <section className="bg-bg-secondary rounded-3xl border border-border-color shadow-card-shadow p-6 overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-text-primary">Trend</h2>
          <div className="flex bg-bg-tertiary p-1 rounded-xl">
            {(['daily', 'weekly', 'monthly'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${
                  period === p 
                    ? 'bg-bg-secondary text-accent shadow-sm' 
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom SVG Line Chart */}
        <div className="h-64 w-full relative mt-8">
          {chartData.length > 0 ? (
            <>
              {/* Y-Axis Labels */}
              <div className="absolute left-0 h-full flex flex-col justify-between text-[10px] text-text-tertiary font-bold pointer-events-none pb-8">
                <span>{max}</span>
                <span>{Math.round((max + min) / 2)}</span>
                <span>{min}</span>
              </div>

              {/* Grid Lines */}
              <div className="absolute inset-x-0 inset-y-0 flex flex-col justify-between py-2 ml-8 pb-8">
                <div className="border-t border-border-color w-full opacity-50" />
                <div className="border-t border-border-color w-full opacity-50" />
                <div className="border-t border-border-color w-full" />
              </div>

              {/* The Line Chart */}
              <div className="ml-8 h-full">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                  {/* Define gradient */}
                  <defs>
                    <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Draw the Area */}
                  {chartData.filter(d => d.value !== null).length > 1 && (
                    <path
                      d={`
                        M 0,${100 - ((chartData.find(d => d.value !== null)!.value! - min) / (max - min)) * 100}
                        ${chartData.map((d, i) => {
                          if (d.value === null) return '';
                          const x = (i / (chartData.length - 1)) * 100;
                          const y = 100 - ((d.value - min) / (max - min)) * 100;
                          return ` L ${x},${y}`;
                        }).join('')}
                        L 100,100 L 0,100 Z
                      `}
                      fill="url(#lineGradient)"
                      className="transition-all duration-1000 ease-out"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}

                  {/* Draw the Line */}
                  {chartData.filter(d => d.value !== null).length > 1 && (
                    <path
                      d={`
                        M 0,${100 - ((chartData.find(d => d.value !== null)!.value! - min) / (max - min)) * 100}
                        ${chartData.map((d, i) => {
                          if (d.value === null) return '';
                          const x = (i / (chartData.length - 1)) * 100;
                          const y = 100 - ((d.value - min) / (max - min)) * 100;
                          return ` L ${x},${y}`;
                        }).join('')}
                      `}
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-1000 ease-out drop-shadow-sm"
                      vectorEffect="non-scaling-stroke"
                    />
                  )}

                  {/* Points */}
                  {chartData.map((d, i) => {
                    if (d.value === null) return null;
                    const x = (i / (chartData.length - 1)) * 100;
                    const y = 100 - ((d.value - min) / (max - min)) * 100;
                    return (
                      <circle
                        key={i}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="4"
                        fill="white"
                        stroke="var(--accent)"
                        strokeWidth="2"
                        className="transition-all duration-1000 ease-out"
                      />
                    );
                  })}
                </svg>
              </div>

              {/* X-Axis Labels */}
              <div className="absolute bottom-0 inset-x-0 ml-8 flex justify-between px-2 text-[10px] text-text-tertiary font-bold uppercase overflow-hidden">
                {chartData.map((d, i) => (
                  <span key={i} className={i % (period === 'daily' ? 3 : 1) === 0 ? 'opacity-100' : 'opacity-0'}>
                    {d.label}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-text-tertiary">
              <p>No data to display yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Recent Logs List */}
      <section className="bg-bg-secondary rounded-3xl border border-border-color shadow-card-shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-bg-tertiary flex items-center justify-center text-text-tertiary">
            <History size={20} />
          </div>
          <h2 className="text-lg font-bold text-text-primary">History</h2>
        </div>
        
        <div className="divide-y divide-border-color/50">
          {logs.slice(0, 10).map((log) => (
            <div key={log.id} className="py-3 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-bg-tertiary flex items-center justify-center text-text-tertiary">
                  <Calendar size={14} />
                </div>
                <span className="text-sm font-medium text-text-primary">
                  {new Date(log.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <span className="font-bold text-text-primary">
                {log.weight} <span className="text-xs text-text-tertiary uppercase">{log.unit}</span>
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center py-4 text-sm text-text-tertiary italic">No logs yet</p>
          )}
        </div>
      </section>
    </div>
  );
}
