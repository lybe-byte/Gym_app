'use client';

import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { useSettings } from '@/context/SettingsContext';
import { getWorkouts } from '@/lib/firestore';
import { useState, useCallback } from 'react';
import { LogOut, Download, Sun, Moon, Monitor } from 'lucide-react';
import type { ThemeMode, WeightUnit } from '@/types';

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

const unitOptions: WeightUnit[] = ['kg', 'lbs'];

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { unit, setUnit } = useSettings();
  const [exporting, setExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (!user) return;
    setExporting(true);
    try {
      const workouts = await getWorkouts(user.uid);
      const rows = [['Date', 'Movement', 'Weight', 'Unit', 'Reps', 'Notes']];
      workouts.forEach((w) => {
        w.entries.forEach((e) => {
          rows.push([
            w.date,
            `"${e.movementName.replace(/"/g, '""')}"`,
            String(e.weight),
            e.unit,
            String(e.reps),
            `"${(e.notes || '').replace(/"/g, '""')}"`,
          ]);
        });
      });
      const csv = rows.map((r) => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gym-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }, [user]);

  return (
    <div className="pt-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-6">Settings</h1>

      {/* Profile */}
      <div className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow card-depth p-4 mb-4">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Profile</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary font-medium">{user?.displayName || 'User'}</p>
            <p className="text-text-tertiary text-sm">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger/10 text-danger font-semibold hover:bg-danger/20 active:scale-95 transition-all"
          >
            <LogOut size={16} />
            Log Out
          </button>
        </div>
      </div>

      {/* Appearance */}
      <div className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow card-depth p-4 mb-4">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Appearance</h2>
        <div className="grid grid-cols-3 gap-2">
          {themeOptions.map((opt) => {
            const Icon = opt.icon;
            const active = theme === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                  active
                    ? 'bg-accent text-text-on-accent shadow-btn-shadow'
                    : 'bg-bg-tertiary text-text-secondary hover:bg-border-color'
                }`}
              >
                <Icon size={18} />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Weight Unit */}
      <div className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow card-depth p-4 mb-4">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Weight Unit</h2>
        <div className="grid grid-cols-2 gap-2">
          {unitOptions.map((u) => (
            <button
              key={u}
              onClick={() => setUnit(u)}
              className={`py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 ${
                unit === u
                   ? 'bg-accent text-text-on-accent shadow-btn-shadow'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-border-color'
              }`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>


      {/* Data */}
      <div className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow card-depth p-4 mb-4">
        <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-3">Data</h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-bg-tertiary text-text-primary font-semibold hover:bg-border-color active:scale-[0.98] disabled:opacity-50 transition-all"
        >
          <Download size={16} />
          {exporting ? 'Exporting...' : 'Export All Data as CSV'}
        </button>
      </div>

      <footer className="text-center text-text-tertiary text-xs py-8">
        Gym Logger • Built with Next.js & Firebase
      </footer>
    </div>
  );
}
