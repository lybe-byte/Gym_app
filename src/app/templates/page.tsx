'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import {
  getTemplates,
  deleteTemplate,
  updateTemplate,
  createTemplate,
  getWorkoutByDate,
  createWorkout,
  addEntriesToWorkout,
  todayDateString,
  generateId,
} from '@/lib/firestore';
import { StaggeredList, SkeletonList } from '@/components/Skeleton';
import { useRouter } from 'next/navigation';
import { Trash2, Pencil, Play, ChevronUp, ChevronDown, Check, Loader2 } from 'lucide-react';
import type { Template, WorkoutEntry } from '@/types';

export default function TemplatesPage() {
  const { user } = useAuth();
  const { unit } = useSettings();
  const router = useRouter();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTemplate, setLoadingTemplate] = useState<string | null>(null);
  const [loadedTemplate, setLoadedTemplate] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getTemplates(user.uid).then((t) => { setTemplates(t); setLoading(false); });
  }, [user]);

  const handleLoad = useCallback(
    async (template: Template) => {
      if (!user) return;
      setLoadingTemplate(template.id);
      try {
        const entries: WorkoutEntry[] = template.entries.map((te) => ({
          id: generateId(),
          movementName: te.movementName,
          reps: te.reps,
          weight: te.weight,
          unit: te.unit,
          notes: '',
          createdAt: Date.now(),
        }));

        let workout = await getWorkoutByDate(user.uid, todayDateString());
        if (!workout) {
          const id = await createWorkout(user.uid, {
            date: todayDateString(),
            entries: [],
            createdAt: Date.now(),
            completed: false,
          });
          workout = { id, date: todayDateString(), entries: [], createdAt: Date.now(), completed: false };
        }
        await addEntriesToWorkout(user.uid, workout.id, entries);
        setLoadingTemplate(null);
        setLoadedTemplate(template.id);
        setTimeout(() => {
          setLoadedTemplate(null);
          router.push('/');
        }, 1200);
      } catch (e) {
        console.error(e);
        setLoadingTemplate(null);
      }
    },
    [user, router]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!user) return;
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      await deleteTemplate(user.uid, id);
    },
    [user]
  );

  const handleReorder = useCallback(
    async (id: string, dir: -1 | 1) => {
      if (!user) return;
      const idx = templates.findIndex((t) => t.id === id);
      const swapIdx = idx + dir;
      if (swapIdx < 0 || swapIdx >= templates.length) return;
      const updated = [...templates];
      [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
      updated.forEach((t, i) => (t.order = i));
      setTemplates(updated);
      await Promise.all(updated.map((t) => updateTemplate(user.uid, t.id, { order: t.order })));
    },
    [user, templates]
  );

  if (loading) {
    return (
      <div className="pt-6">
        <div className="skeleton h-8 w-40 rounded-lg mb-4" />
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="pt-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Templates</h1>

      {templates.length === 0 ? (
        <div className="text-center py-16 text-text-tertiary">
          <p className="text-lg">No templates yet</p>
          <p className="text-sm mt-1">Templates will appear here after your first login seeds them</p>
        </div>
      ) : (
        <div className="space-y-3">
          <StaggeredList>
            {templates.map((t, idx) => {
              const preview = t.entries.map((e) => e.movementName).join(', ');
              const isLoading = loadingTemplate === t.id;
              const isLoaded = loadedTemplate === t.id;
              return (
                <div key={t.id} className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow card-depth p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-text-primary">{t.name}</h3>
                      <p className="text-text-tertiary text-xs truncate max-w-[200px]">{preview}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleReorder(t.id, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 active:scale-90 disabled:opacity-30 transition-all"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        onClick={() => handleReorder(t.id, 1)}
                        disabled={idx === templates.length - 1}
                        className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 active:scale-90 disabled:opacity-30 transition-all"
                      >
                        <ChevronDown size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleLoad(t)}
                      disabled={isLoading || isLoaded}
                      className={`flex-1 py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                        isLoaded
                          ? 'bg-success text-white'
                          : 'bg-accent text-text-on-accent shadow-btn-shadow hover:shadow-btn-shadow-hover'
                      }`}
                    >
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : isLoaded ? <><Check size={16} /> Loaded!</> : <><Play size={16} /> Load</>}
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2.5 rounded-xl text-text-tertiary hover:text-danger hover:bg-danger/10 active:scale-90 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Entry details */}
                  <div className="mt-3 space-y-1">
                    {t.entries.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                        <span className="text-text-tertiary font-mono w-4">{i + 1}.</span>
                        <span>{e.movementName}</span>
                        <span className="text-text-tertiary ml-auto">{e.reps}×{e.weight}{e.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </StaggeredList>
        </div>
      )}
    </div>
  );
}
