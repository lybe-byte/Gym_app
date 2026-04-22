'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUserSettings, saveUserSettings } from '@/lib/firestore';
import { useTheme } from './ThemeContext';
import type { UserSettings, WeightUnit, ThemeMode } from '@/types';

interface SettingsContextType {
  unit: WeightUnit;
  setUnit: (u: WeightUnit) => void;
  weight: number;
  setWeight: (w: number) => void;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  unit: 'kg',
  setUnit: () => {},
  weight: 75,
  setWeight: () => {},
  loading: true,
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [unit, setUnitState] = useState<WeightUnit>('kg');
  const [weight, setWeightState] = useState<number>(75);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    getUserSettings(user.uid).then((s) => {
      if (s) {
        setUnitState(s.unit);
        setTheme(s.theme);
        if (s.weight) setWeightState(s.weight);
      }
      setLoading(false);
    });
  }, [user, setTheme]);

  const setUnit = useCallback(
    (u: WeightUnit) => {
      setUnitState(u);
      if (user) {
        saveUserSettings(user.uid, { unit: u, theme, weight });
      }
    },
    [user, theme, weight]
  );

  const setWeight = useCallback(
    (w: number) => {
      setWeightState(w);
      if (user) {
        saveUserSettings(user.uid, { unit, theme, weight: w });
      }
    },
    [user, theme, unit]
  );

  // Sync theme changes to Firestore
  useEffect(() => {
    if (user && !loading) {
      saveUserSettings(user.uid, { unit, theme, weight });
    }
  }, [theme, user, unit, weight, loading]);

  return (
    <SettingsContext.Provider value={{ unit, setUnit, weight, setWeight, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}
