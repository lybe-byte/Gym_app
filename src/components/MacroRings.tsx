'use client';

import React from 'react';

interface MacroRingsProps {
  calories: { current: number; goal: number };
  protein: { current: number; goal: number };
  carbs: { current: number; goal: number };
  fat: { current: number; goal: number };
  size?: number;
}

export default function MacroRings({ calories, protein, carbs, fat, size = 220 }: MacroRingsProps) {
  const rings = [
    { ...calories, color: 'var(--warning)', label: 'Cal', strokeWidth: 12, radius: 90 },
    { ...protein, color: 'var(--accent)', label: 'Pro', strokeWidth: 10, radius: 74 },
    { ...carbs, color: 'var(--success)', label: 'Car', strokeWidth: 8, radius: 60 },
    { ...fat, color: 'var(--info)', label: 'Fat', strokeWidth: 6, radius: 48 },
  ];

  const center = size / 2;

  return (
    <div className="relative flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((ring, i) => {
          const circumference = 2 * Math.PI * ring.radius;
          const pct = Math.min((ring.current / ring.goal) * 100, 100) || 0;
          const offset = circumference - (pct / 100) * circumference;

          return (
            <React.Fragment key={i}>
              {/* Background Ring */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={ring.strokeWidth}
                className="text-bg-tertiary/30"
              />
              {/* Progress Ring */}
              <circle
                cx={center}
                cy={center}
                r={ring.radius}
                fill="none"
                stroke={ring.color}
                strokeWidth={ring.strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
                className="transition-all duration-1000 ease-out"
                style={{ filter: `drop-shadow(0 0 3px ${ring.color}80)` }}
              />
            </React.Fragment>
          );
        })}
      </svg>
      
      <div className="absolute flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-black text-text-primary">
          {Math.round(calories.current).toLocaleString()}
        </span>
        <span className="text-[10px] uppercase tracking-widest text-text-tertiary font-bold">
          kcal logged
        </span>
      </div>
    </div>
  );
}
