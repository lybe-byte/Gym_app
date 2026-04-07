'use client';

import { useState, useCallback } from 'react';
import { Trash2, Copy, Pencil, Check, X } from 'lucide-react';
import type { WorkoutEntry } from '@/types';

interface WorkoutListProps {
  entries: WorkoutEntry[];
  onUpdate: (entries: WorkoutEntry[]) => void;
  onDeleteMovement?: (movementName: string) => void;
  showUndoOnDelete?: boolean;
}

export default function WorkoutList({
  entries,
  onUpdate,
  onDeleteMovement,
  showUndoOnDelete = true,
}: WorkoutListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');

  // Group entries by movement
  const grouped = entries.reduce<Record<string, WorkoutEntry[]>>((acc, e) => {
    if (!acc[e.movementName]) acc[e.movementName] = [];
    acc[e.movementName].push(e);
    return acc;
  }, {});

  const startEdit = useCallback((entry: WorkoutEntry) => {
    setEditingId(entry.id);
    setEditReps(String(entry.reps));
    setEditWeight(String(entry.weight));
  }, []);

  const saveEdit = useCallback(
    (entryId: string) => {
      const updated = entries.map((e) =>
        e.id === entryId ? { ...e, reps: parseInt(editReps) || e.reps, weight: parseFloat(editWeight) || e.weight } : e
      );
      onUpdate(updated);
      setEditingId(null);
    },
    [entries, editReps, editWeight, onUpdate]
  );

  const deleteEntry = useCallback(
    (entryId: string) => {
      onUpdate(entries.filter((e) => e.id !== entryId));
    },
    [entries, onUpdate]
  );

  const duplicateEntry = useCallback(
    (entry: WorkoutEntry) => {
      const dup: WorkoutEntry = {
        ...entry,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      const idx = entries.findIndex((e) => e.id === entry.id);
      const updated = [...entries];
      updated.splice(idx + 1, 0, dup);
      onUpdate(updated);
    },
    [entries, onUpdate]
  );

  const totalSets = entries.length;
  const totalVolume = entries.reduce((sum, e) => sum + e.reps * e.weight, 0);

  if (entries.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-text-secondary font-semibold text-sm uppercase tracking-wider">
          Logged Sets
        </h3>
        <span className="text-text-tertiary text-xs">
          {totalSets} sets · {totalVolume.toLocaleString()} {entries[0]?.unit || 'kg'} total
        </span>
      </div>

      <div className="space-y-3">
        {Object.entries(grouped).map(([moveName, sets]) => (
          <div
            key={moveName}
            className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow overflow-hidden"
          >
            {/* Movement header */}
            <div className="flex items-center justify-between px-4 py-3 bg-bg-accent/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-text-primary">{moveName}</span>
                <span className="text-xs text-text-tertiary bg-bg-tertiary rounded-full px-2 py-0.5">
                  {sets.length}
                </span>
              </div>
              {onDeleteMovement && (
                <button
                  onClick={() => onDeleteMovement(moveName)}
                  className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 active:scale-90 transition-all"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Set rows */}
            <div className="divide-y divide-border-color">
              {sets.map((entry, i) => (
                <div
                  key={entry.id}
                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-bg-accent/30 transition-colors"
                >
                  <span className="text-text-tertiary text-xs font-mono w-6">{i + 1}.</span>

                  {editingId === entry.id ? (
                    <>
                      <input
                        type="number"
                        value={editReps}
                        onChange={(e) => setEditReps(e.target.value)}
                        className="w-16 bg-bg-primary text-center py-1 rounded-lg border border-accent text-text-primary focus:outline-none"
                        autoFocus
                      />
                      <span className="text-text-tertiary">×</span>
                      <input
                        type="number"
                        value={editWeight}
                        onChange={(e) => setEditWeight(e.target.value)}
                        className="w-20 bg-bg-primary text-center py-1 rounded-lg border border-accent text-text-primary focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(entry.id)}
                      />
                      <span className="text-text-tertiary text-xs">{entry.unit}</span>
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => saveEdit(entry.id)}
                          className="p-1 rounded text-success hover:bg-success/10 active:scale-90 transition-all"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 rounded text-text-tertiary hover:bg-bg-tertiary active:scale-90 transition-all"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEdit(entry)}
                        className="text-text-primary font-medium hover:text-accent transition-colors"
                      >
                        {entry.reps} × {entry.weight}
                      </button>
                      <span className="text-text-tertiary text-xs">{entry.unit}</span>
                      <div className="ml-auto flex gap-1">
                        <button
                          onClick={() => duplicateEntry(entry)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 active:scale-90 transition-all"
                          title="Duplicate set"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => startEdit(entry)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 active:scale-90 transition-all"
                          title="Edit set"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => deleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 active:scale-90 transition-all"
                          title="Delete set"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
