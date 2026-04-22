'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Activity, ClipboardList, Dumbbell, BarChart2, TrendingUp, Settings } from 'lucide-react';

const tabs = [
  { href: '/', label: 'Workout', icon: Activity },
  { href: '/templates', label: 'Templates', icon: ClipboardList },
  { href: '/movements', label: 'Moves', icon: Dumbbell },
  { href: '/history', label: 'History', icon: BarChart2 },
  { href: '/weight', label: 'Weight', icon: TrendingUp },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="mx-auto max-w-lg bg-glass-bg backdrop-blur-xl border-t border-glass-border">
        <div className="flex justify-around items-center py-1.5">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all active:scale-90 ${
                  active
                    ? 'text-accent scale-105 drop-shadow-[0_0_8px_var(--accent)]'
                    : 'text-text-tertiary hover:text-accent/70'
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 2} />
                <span className="text-[10px] font-bold uppercase tracking-wider">{tab.label}</span>
                {active && (
                  <span className="w-1 h-1 rounded-full bg-accent mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
        {/* iOS home indicator spacer */}
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </nav>
  );
}
