'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getMovements, addMovement, updateMovement, deleteMovement } from '@/lib/firestore';
import { StaggeredList, SkeletonList } from '@/components/Skeleton';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Trash2, Pencil, Plus, Check, X, Search } from 'lucide-react';
import type { Movement, Category } from '@/types';

const CATEGORIES: Category[] = ['Legs', 'Back', 'Chest', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Other'];

export default function MovementsPage() {
  const { user } = useAuth();
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Category | 'All'>('All');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<Category>('Legs');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('Legs');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    getMovements(user.uid).then((m) => {
      setMovements(m.sort((a, b) => a.name.localeCompare(b.name)));
      setLoading(false);
    });
  }, [user]);

  const filtered = useMemo(() => {
    return movements.filter((m) => {
      const matchSearch = m.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'All' || m.category === filter;
      return matchSearch && matchFilter;
    });
  }, [movements, search, filter]);

  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Movement[]>>((acc, m) => {
      if (!acc[m.category]) acc[m.category] = [];
      acc[m.category].push(m);
      return acc;
    }, {});
  }, [filtered]);

  const handleAdd = useCallback(async () => {
    if (!user || !newName.trim()) return;
    const id = await addMovement(user.uid, { name: newName.trim(), category: newCategory, isCustom: true });
    setMovements((prev) => [...prev, { id, name: newName.trim(), category: newCategory, isCustom: true }].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
  }, [user, newName, newCategory]);

  const confirmDeleteMovement = useCallback(async () => {
    if (!user || !deleteTarget) return;
    setMovements((prev) => prev.filter((m) => m.id !== deleteTarget.id));
    await deleteMovement(user.uid, deleteTarget.id);
    setDeleteTarget(null);
  }, [user, deleteTarget]);

  const startEdit = useCallback((m: Movement) => {
    setEditingId(m.id);
    setEditName(m.name);
    setEditCategory(m.category);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!user || !editingId) return;
    setMovements((prev) => prev.map((m) =>
      m.id === editingId ? { ...m, name: editName, category: editCategory } : m
    ).sort((a, b) => a.name.localeCompare(b.name)));
    await updateMovement(user.uid, editingId, { name: editName, category: editCategory });
    setEditingId(null);
  }, [user, editingId, editName, editCategory]);

  if (loading) {
    return (
      <div className="pt-6">
        <div className="skeleton h-8 w-40 rounded-lg mb-4" />
        <SkeletonList count={6} />
      </div>
    );
  }

  return (
    <div className="pt-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-text-primary mb-4">Movements</h1>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          placeholder="Search movements..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-bg-secondary text-text-primary py-3 pl-10 pr-4 rounded-xl border border-border-color focus:border-accent focus:outline-none transition-colors"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
        <button
          onClick={() => setFilter('All')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
            filter === 'All' ? 'bg-accent text-text-on-accent shadow-btn-shadow' : 'bg-bg-tertiary text-text-secondary'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
              filter === c ? 'bg-accent text-text-on-accent shadow-btn-shadow' : 'bg-bg-tertiary text-text-secondary'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Add movement */}
      <div className="bg-bg-secondary rounded-xl border border-border-color p-4 mb-4 shadow-card-shadow">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Add Custom Movement</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Movement name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 bg-bg-primary text-text-primary py-2.5 px-3 rounded-lg border border-border-color focus:border-accent focus:outline-none transition-colors"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as Category)}
            className="bg-bg-primary text-text-primary py-2.5 px-3 rounded-lg border border-border-color focus:border-accent focus:outline-none transition-colors"
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="p-2.5 rounded-lg bg-accent text-text-on-accent shadow-btn-shadow hover:shadow-btn-shadow-hover active:scale-95 disabled:opacity-50 transition-all"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Movement list */}
      {Object.entries(grouped).map(([category, moves]) => (
        <div key={category} className="mb-4">
          <h2 className="text-sm font-bold text-accent uppercase tracking-wider mb-2">{category}</h2>
          <div className="bg-bg-secondary rounded-xl border border-border-color shadow-card-shadow overflow-hidden">
            <StaggeredList>
              {moves.map((m) => (
                <div key={m.id} className="flex items-center justify-between px-4 py-3 border-b border-border-color last:border-b-0 hover:bg-bg-accent/30 transition-colors">
                  {editingId === m.id ? (
                    <>
                      <div className="flex-1 flex gap-2 mr-2">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 bg-bg-primary text-text-primary py-1.5 px-2 rounded-lg border border-accent focus:outline-none text-sm"
                          autoFocus
                        />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value as Category)}
                          className="bg-bg-primary text-text-primary py-1.5 px-2 rounded-lg border border-accent focus:outline-none text-sm"
                        >
                          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="p-1 text-success hover:bg-success/10 rounded active:scale-90 transition-all"><Check size={16} /></button>
                        <button onClick={() => setEditingId(null)} className="p-1 text-text-tertiary hover:bg-bg-tertiary rounded active:scale-90 transition-all"><X size={16} /></button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-text-primary text-sm">{m.name}</span>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(m)} className="p-1.5 rounded-lg text-text-tertiary hover:text-accent hover:bg-accent/10 active:scale-90 transition-all"><Pencil size={14} /></button>
                        <button onClick={() => setDeleteTarget({ id: m.id, name: m.name })} className="p-1.5 rounded-lg text-text-tertiary hover:text-danger hover:bg-danger/10 active:scale-90 transition-all"><Trash2 size={14} /></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </StaggeredList>
          </div>
        </div>
      ))}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Are you sure?"
        message={deleteTarget ? `Do you really want to delete "${deleteTarget.name}"?` : ''}
        confirmLabel="Delete"
        onConfirm={confirmDeleteMovement}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
