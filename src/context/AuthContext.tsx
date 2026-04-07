'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { getMovements, addMovement, getTemplates, createTemplate } from '@/lib/firestore';
import { DEFAULT_MOVEMENTS, DEFAULT_TEMPLATES } from '@/lib/seedData';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithPopup: () => Promise<void>;
  loginWithRedirect: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  loginWithPopup: async () => {},
  loginWithRedirect: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

async function seedIfNeeded(userId: string) {
  // Seed movements
  const existing = await getMovements(userId);
  if (existing.length === 0) {
    await Promise.all(
      DEFAULT_MOVEMENTS.map((m) =>
        addMovement(userId, { name: m.name, category: m.category, isCustom: false })
      )
    );
  }
  // Seed templates
  const templates = await getTemplates(userId);
  if (templates.length === 0) {
    await Promise.all(
      DEFAULT_TEMPLATES.map((t, i) =>
        createTemplate(userId, {
          name: t.name,
          entries: t.entries,
          createdAt: Date.now(),
          order: i,
        })
      )
    );
  }
}

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth(), async (u) => {
      setUser(u);
      if (u) {
        try {
          await seedIfNeeded(u.uid);
        } catch (e) {
          console.error('Seed error:', e);
        }
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loginWithPopup = useCallback(async () => {
    try {
      await signInWithPopup(auth(), googleProvider);
    } catch (err: unknown) {
      const error = err as { code?: string };
      if (error.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth(), googleProvider);
      } else {
        throw err;
      }
    }
  }, []);

  const loginWithRedirect = useCallback(async () => {
    await signInWithRedirect(auth(), googleProvider);
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth());
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithPopup, loginWithRedirect, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
