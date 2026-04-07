'use client';

import { type ReactNode } from 'react';

export function StaggeredList({ children }: { children: ReactNode[] | ReactNode }) {
  const items = Array.isArray(children) ? children : [children];
  return (
    <>
      {items.map((child, i) => (
        <div
          key={i}
          className="animate-stagger-in"
          style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
        >
          {child}
        </div>
      ))}
    </>
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton rounded-xl h-24 mb-3" />
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function ErrorBoundaryFallback({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-4">
      <h2 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h2>
      <p className="text-text-secondary mb-4">An unexpected error occurred.</p>
      <button
        onClick={onReset}
        className="bg-accent text-text-on-accent font-semibold px-6 py-3 rounded-xl shadow-btn-shadow hover:shadow-btn-shadow-hover active:scale-95 transition-all"
      >
        Refresh
      </button>
    </div>
  );
}
