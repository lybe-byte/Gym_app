'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useSettings } from '@/context/SettingsContext';
import { getNutritionLog, saveNutritionLog, todayDateString } from '@/lib/firestore';
import { analyzeFood } from '@/lib/gemini';
import MacroRings from '@/components/MacroRings';
import { 
  Utensils, 
  Sparkles, 
  Trash2, 
  History,
  Info,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import type { FoodItem, NutritionLog } from '@/types';

export default function NutritionPage() {
  const { user } = useAuth();
  const { weight } = useSettings();
  const [log, setLog] = useState<NutritionLog | null>(null);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentDate, setCurrentDate] = useState(todayDateString());

  // Goals based on current weight
  const goals = useMemo(() => {
    const cals = weight * 33;
    const protein = weight * 2;
    const fat = (cals * 0.25) / 9;
    const carbs = (cals - (protein * 4) - (fat * 9)) / 4;
    return { cals, protein, carbs, fat };
  }, [weight]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    getNutritionLog(user.uid, currentDate).then((data) => {
      setLog(data || null);
      setLoading(false);
    });
  }, [user, currentDate]);

  const handlePrevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d.toISOString().slice(0, 10));
  };

  const handleNextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d.toISOString().slice(0, 10));
  };

  const handleAnalyze = async () => {
    if (!user || !userInput.trim() || analyzing) return;
    setAnalyzing(true);
    
    try {
      const items = await analyzeFood(userInput);
      if (items.length === 0) {
        setAnalyzing(false);
        return;
      }

      const currentLog = log || {
        id: currentDate,
        date: currentDate,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        items: [],
        updatedAt: Date.now()
      };

      const newItems = [...currentLog.items, ...items];
      const updatedLog: NutritionLog = {
        ...currentLog,
        items: newItems,
        totalCalories: newItems.reduce((s, i) => s + i.calories, 0),
        totalProtein: newItems.reduce((s, i) => s + i.protein, 0),
        totalCarbs: newItems.reduce((s, i) => s + i.carbs, 0),
        totalFat: newItems.reduce((s, i) => s + i.fat, 0),
        updatedAt: Date.now()
      };

      await saveNutritionLog(user.uid, updatedLog);
      setLog(updatedLog);
      setUserInput('');
    } catch (e: any) {
      console.error("Nutrition analysis error:", e);
      alert(`Nutrition Error: ${e.message || "Unknown error"}. Please check if NEXT_PUBLIC_GEMINI_API_KEY is correctly set in Vercel settings.`);
    } finally {
      setAnalyzing(false);
    }
  };

  const removeItem = async (itemId: string) => {
    if (!user || !log) return;
    const newItems = log.items.filter(i => i.id !== itemId);
    const updatedLog: NutritionLog = {
      ...log,
      items: newItems,
      totalCalories: newItems.reduce((s, i) => s + i.calories, 0),
      totalProtein: newItems.reduce((s, i) => s + i.protein, 0),
      totalCarbs: newItems.reduce((s, i) => s + i.carbs, 0),
      totalFat: newItems.reduce((s, i) => s + i.fat, 0),
      updatedAt: Date.now()
    };
    await saveNutritionLog(user.uid, updatedLog);
    setLog(updatedLog);
  };

  if (loading) {
    return (
      <div className="pt-6 px-4 space-y-6">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton h-64 rounded-3xl" />
        <div className="skeleton h-32 rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="pt-6 pb-24 px-4 animate-fade-in flex flex-col gap-6 max-w-lg mx-auto">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Nutrition</h1>
          <p className="text-sm text-text-tertiary">Fuel your progress</p>
        </div>
        <div className="p-3 rounded-2xl bg-bg-warning/10 text-warning shadow-sm">
          <Utensils size={24} />
        </div>
      </header>

      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-bg-secondary border border-border-color rounded-2xl p-2 select-none">
        <button 
          onClick={handlePrevDay}
          className="p-3 text-text-secondary hover:text-accent active:scale-95 transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-text-primary">
            {currentDate === todayDateString() ? "Today" : new Date(currentDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <button 
          onClick={handleNextDay}
          disabled={currentDate === todayDateString()}
          className="p-3 text-text-secondary hover:text-accent active:scale-95 disabled:opacity-30 disabled:hover:text-text-secondary transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Progress Chart Card */}
      <section className="bg-bg-secondary rounded-3xl border border-border-color shadow-card-shadow p-6 flex flex-col items-center gap-6 relative overflow-hidden">
        <div className="absolute top-4 right-4 group">
          <Info size={16} className="text-text-tertiary cursor-help" />
          <div className="absolute top-6 right-0 w-48 bg-bg-tertiary border border-border-color rounded-xl p-3 text-[10px] text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none shadow-xl">
            Goals calculated for {weight}kg body weight:<br/>
            Cals: ~{Math.round(goals.cals)}<br/>
            Protein: {Math.round(goals.protein)}g
          </div>
        </div>

        <MacroRings 
          calories={{ current: log?.totalCalories || 0, goal: goals.cals }}
          protein={{ current: log?.totalProtein || 0, goal: goals.protein }}
          carbs={{ current: log?.totalCarbs || 0, goal: goals.carbs }}
          fat={{ current: log?.totalFat || 0, goal: goals.fat }}
        />

        <div className="grid grid-cols-3 w-full gap-4 pt-2">
          <MacroSummary label="Protein" current={log?.totalProtein || 0} goal={goals.protein} color="text-accent" />
          <MacroSummary label="Carbs" current={log?.totalCarbs || 0} goal={goals.carbs} color="text-success" />
          <MacroSummary label="Fat" current={log?.totalFat || 0} goal={goals.fat} color="text-info" />
        </div>
      </section>

      {/* AI Logging Area */}
      <section className="bg-bg-secondary rounded-3xl border border-border-color shadow-card-shadow p-5 flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm font-bold text-text-secondary">
          <Sparkles size={16} className="text-accent" />
          <span>Smart Food Logger</span>
        </div>
        <div className="relative">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="E.g. 'A bowl of oatmeal with blueberries and a protein shake'"
            className="w-full bg-bg-primary border border-border-color rounded-2xl p-4 text-sm focus:outline-none focus:border-accent transition-all resize-none h-24"
          />
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !userInput.trim()}
            className="absolute bottom-3 right-3 bg-accent text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 active:scale-95 disabled:opacity-50 transition-all shadow-lg"
          >
            {analyzing ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <Sparkles size={16} />
                <span>Log</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* History Area */}
      <section className="bg-bg-secondary rounded-3xl border border-border-color shadow-card-shadow p-6">
        <div className="flex items-center gap-2 mb-4 text-sm font-bold text-text-secondary">
          <History size={16} />
          <span>{currentDate === todayDateString() ? "Today's Items" : "Logged Items"}</span>
        </div>
        
        <div className="space-y-3">
          {log?.items.map((item) => (
            <div key={item.id} className="flex justify-between items-center bg-bg-primary/50 border border-border-color/50 rounded-2xl p-4 group">
              <div className="flex flex-col">
                <span className="text-sm font-bold text-text-primary capitalize">{item.name}</span>
                <span className="text-[10px] text-text-tertiary">
                  {item.calories} kcal · {item.protein}g P · {item.carbs}g C · {item.fat}g F
                </span>
                {item.notes && (
                  <p className="text-[10px] text-text-secondary mt-1 italic">
                    "{item.notes}"
                  </p>
                )}
              </div>
              <button 
                onClick={() => removeItem(item.id)}
                className="p-2 text-text-tertiary hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          {(!log || log.items.length === 0) && (
            <div className="text-center py-6 text-text-tertiary italic text-sm">
              No items logged today.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MacroSummary({ label, current, goal, color }: { label: string; current: number; goal: number; color: string }) {
  const pct = Math.min((current / goal) * 100, 100);
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-text-tertiary font-bold uppercase mb-1">{label}</span>
      <span className={`text-sm font-black ${color}`}>
        {Math.round(current)}<span className="text-[10px] opacity-70 ml-0.5">g</span>
      </span>
      <div className="h-1 w-full bg-bg-tertiary rounded-full mt-2 overflow-hidden">
        <div className={`h-full ${color.replace('text-', 'bg-')}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
