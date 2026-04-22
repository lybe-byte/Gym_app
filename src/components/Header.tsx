'use client';

import Link from 'next/link';
import { Settings, Dumbbell } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-lg bg-glass-bg/80 backdrop-blur-xl border-b border-glass-border px-6 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-text-on-accent shadow-btn-shadow group-hover:scale-110 transition-transform">
            <Dumbbell size={18} />
          </div>
          <span className="text-lg font-bold tracking-tight text-text-primary">
            Gym<span className="text-accent">Logger</span>
          </span>
        </Link>

        <Link 
          href="/settings"
          className={`p-2 rounded-xl transition-all active:scale-95 ${
            pathname === '/settings'
              ? 'bg-accent text-text-on-accent shadow-btn-shadow'
              : 'bg-bg-tertiary text-text-secondary hover:bg-border-color'
          }`}
        >
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}
