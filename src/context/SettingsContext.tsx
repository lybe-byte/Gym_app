'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUserSettings, saveUserSettings } from '@/lib/firestore';
import { useTheme } from './ThemeContext';
import type { UserSettings, WeightUnit, ThemeMode } from '@/types';

interface SettingsContextType {
  unit: WeightUnit;
  setUnit: (u: WeightUnit) => void;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextType>({
  unit: 'kg',
  setUnit: () => {},
  loading: true,
});

export function useSettings() {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [unit, setUnitState] = useState<WeightUnit>('kg');
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
      }
      setLoading(false);
    });
  }, [user, setTheme]);

  const setUnit = useCallback(
    (u: WeightUnit) => {
      setUnitState(u);
      if (user) {
        saveUserSettings(user.uid, { unit: u, theme });
      }
    },
    [user, theme]
  );

  // Sync theme changes to Firestore
  useEffect(() => {
    if (user && !loading) {
      saveUserSettings(user.uid, { unit, theme });
    }
  }, [theme, user, unit, loading]);

  return (
    <SettingsContext.Provider value={{ unit, setUnit, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}
