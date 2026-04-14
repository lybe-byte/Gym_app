export type Category = 'Legs' | 'Back' | 'Chest' | 'Shoulders' | 'Arms' | 'Core' | 'Cardio' | 'Other';
export type WeightUnit = 'kg' | 'lbs';
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Movement {
  id: string;
  name: string;
  category: Category;
  isCustom: boolean;
}

export interface WorkoutEntry {
  id: string;
  movementName: string;
  reps: number;
  weight: number;
  unit: WeightUnit;
  notes: string;
  createdAt: number;
}

export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD
  entries: WorkoutEntry[];
  createdAt: number;
  completed: boolean;
}

export interface TemplateEntry {
  movementName: string;
  reps: number;
  weight: number;
  unit: WeightUnit;
}

export interface Template {
  id: string;
  name: string;
  entries: TemplateEntry[];
  createdAt: number;
  order: number;
}

export interface UserSettings {
  unit: WeightUnit;
  theme: ThemeMode;
}

export interface Run {
  id: string;
  date: string; // YYYY-MM-DD
  duration: number; // in seconds
  distance: number; // in meters
  averagePace: number; // seconds per meter/km depending on calculation
  createdAt: number;
}

export interface RoutePoint {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  speed: number | null;
}

export interface StepData {
  date: string; // YYYY-MM-DD
  steps: number;
  distance: number; // in meters
  calories: number;
  updatedAt: number;
}
