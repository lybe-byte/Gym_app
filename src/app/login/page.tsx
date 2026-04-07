'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function LoginPage() {
  const { user, loginWithPopup, loginWithRedirect } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  const handlePopup = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithPopup();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithRedirect();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center -mt-24 px-4">
      <div className="w-full max-w-sm bg-bg-secondary rounded-2xl p-8 shadow-card-shadow-lg border border-border-color animate-modal-in">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-accent/10 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
              <path d="M6.5 6.5h11M6.5 17.5h11M3 12h18M4.5 6.5v11M19.5 6.5v11M2 9.5h3M2 14.5h3M19 9.5h3M19 14.5h3" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Gym Logger</h1>
          <p className="text-text-secondary text-sm mt-1">Track your lifts. Get stronger.</p>
        </div>

        <button
          onClick={handlePopup}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-bg-primary border border-border-color py-3.5 px-4 rounded-xl font-semibold text-text-primary hover:border-accent hover:shadow-card-shadow-hover active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>

        <button
          onClick={handleRedirect}
          disabled={loading}
          className="w-full mt-3 py-3 text-sm text-text-tertiary hover:text-accent transition-colors"
        >
          Use redirect sign-in instead
        </button>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm animate-fade-in">
            <div className="flex justify-between items-start">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-danger hover:text-danger-hover ml-2">×</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
