'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, RotateCcw, MessageSquare } from 'lucide-react';
import type { Movement, WorkoutEntry, WeightUnit } from '@/types';

interface WorkoutFormProps {
  movements: Movement[];
  lastEntry: WorkoutEntry | null;
  unit: WeightUnit;
  onLog: (movementName: string, reps: number, weight: number, unit: WeightUnit, notes: string) => void;
}

export default function WorkoutForm({ movements, lastEntry, unit, onLog }: WorkoutFormProps) {
  const [movementName, setMovementName] = useState('');
  const [reps, setReps] = useState<string>('');
  const [weight, setWeight] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [suggestions, setSuggestions] = useState<Movement[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleMovementChange = useCallback(
    (val: string) => {
      setMovementName(val);
      if (val.trim().length > 0) {
        const filtered = movements
          .filter((m) => m.name.toLowerCase().includes(val.toLowerCase()))
          .slice(0, 8);
        setSuggestions(filtered);
        setShowSuggestions(filtered.length > 0);
      } else {
        setShowSuggestions(false);
      }
    },
    [movements]
  );

  const selectSuggestion = useCallback((name: string) => {
    setMovementName(name);
    setShowSuggestions(false);
  }, []);

  const handleLog = useCallback(() => {
    if (!movementName.trim() || !reps) return;
    onLog(movementName.trim(), parseInt(reps) || 0, parseFloat(weight) || 0, unit, notes);
    setMovementName('');
    setReps('');
    setWeight('');
    setNotes('');
    setShowNotes(false);
    inputRef.current?.focus();
  }, [movementName, reps, weight, unit, notes, onLog]);

  const handleRepeat = useCallback(() => {
    if (!lastEntry) return;
    onLog(lastEntry.movementName, lastEntry.reps, lastEntry.weight, lastEntry.unit, '');
    inputRef.current?.focus();
  }, [lastEntry, onLog]);

  return (
    <div className="bg-bg-secondary rounded-2xl p-4 shadow-card-shadow border border-border-color">
      <div className="relative mb-3">
        <input
          ref={inputRef}
          type="text"
          placeholder="Movement name..."
          value={movementName}
          onChange={(e) => handleMovementChange(e.target.value)}
          onFocus={() => movementName && handleMovementChange(movementName)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          className="w-full bg-bg-primary text-text-primary text-lg py-3.5 px-4 rounded-xl border border-border-color focus:border-accent focus:outline-none transition-colors"
        />
        {showSuggestions && (
          <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-bg-secondary border border-border-color rounded-xl shadow-card-shadow-lg overflow-hidden animate-fade-in">
            {suggestions.map((m) => (
              <button
                key={m.id}
                onMouseDown={() => selectSuggestion(m.name)}
                className="w-full text-left px-4 py-3 text-text-primary hover:bg-bg-accent transition-colors border-b border-border-color last:border-b-0"
              >
                <span className="font-medium">{m.name}</span>
                <span className="text-text-tertiary text-xs ml-2">{m.category}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 mb-3">
        <input
          type="number"
          placeholder="Reps"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
          className="flex-1 bg-bg-primary text-text-primary text-lg py-3.5 px-4 rounded-xl border border-border-color focus:border-accent focus:outline-none transition-colors"
        />
        <input
          type="number"
          placeholder={`Weight (${unit})`}
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          className="flex-1 bg-bg-primary text-text-primary text-lg py-3.5 px-4 rounded-xl border border-border-color focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {showNotes && (
        <textarea
          placeholder="Notes..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full mb-3 bg-bg-primary text-text-primary py-3 px-4 rounded-xl border border-border-color focus:border-accent focus:outline-none transition-colors resize-none h-20"
        />
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="p-3 rounded-xl bg-bg-tertiary text-text-secondary hover:text-accent active:scale-95 transition-all"
          title="Add notes"
        >
          <MessageSquare size={20} />
        </button>
        <button
          onClick={handleLog}
          disabled={!movementName.trim() || !reps}
          className="flex-1 bg-accent text-text-on-accent font-bold text-lg py-3.5 rounded-xl shadow-btn-shadow hover:shadow-btn-shadow-hover active:scale-95 active:shadow-btn-shadow-pressed disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={20} /> Log Set
        </button>
      </div>

      {lastEntry && (
        <button
          onClick={handleRepeat}
          className="w-full mt-2 py-3 rounded-xl bg-bg-accent text-accent font-medium hover:bg-accent/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <RotateCcw size={16} />
          Repeat: {lastEntry.movementName} — {lastEntry.reps}×{lastEntry.weight}{lastEntry.unit}
        </button>
      )}
    </div>
  );
}
