import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Movement, Workout, WorkoutEntry, Template, UserSettings, WeightUnit } from '@/types';

// ─── Movements ───────────────────────────────────────────────

export async function getMovements(userId: string): Promise<Movement[]> {
  const snap = await getDocs(collection(db(), 'users', userId, 'movements'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Movement));
}

export async function addMovement(userId: string, movement: Omit<Movement, 'id'>): Promise<string> {
  const ref = doc(collection(db(), 'users', userId, 'movements'));
  await setDoc(ref, movement);
  return ref.id;
}

export async function updateMovement(userId: string, id: string, data: Partial<Movement>): Promise<void> {
  await updateDoc(doc(db(), 'users', userId, 'movements', id), data);
}

export async function deleteMovement(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', userId, 'movements', id));
}

// ─── Workouts ────────────────────────────────────────────────

export async function getWorkouts(userId: string): Promise<Workout[]> {
  const snap = await getDocs(
    query(collection(db(), 'users', userId, 'workouts'), orderBy('createdAt', 'desc'))
  );
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Workout))
    .filter((w) => w.entries && w.entries.length > 0);
}

export async function getWorkoutByDate(userId: string, date: string): Promise<Workout | null> {
  const snap = await getDocs(collection(db(), 'users', userId, 'workouts'));
  const match = snap.docs.find((d) => d.data().date === date);
  if (!match) return null;
  return { id: match.id, ...match.data() } as Workout;
}

export async function createWorkout(userId: string, workout: Omit<Workout, 'id'>): Promise<string> {
  const ref = doc(collection(db(), 'users', userId, 'workouts'));
  await setDoc(ref, workout);
  return ref.id;
}

export async function addEntriesToWorkout(
  userId: string,
  workoutId: string,
  newEntries: WorkoutEntry[]
): Promise<void> {
  const ref = doc(db(), 'users', userId, 'workouts', workoutId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const existing = (snap.data().entries || []) as WorkoutEntry[];
  await updateDoc(ref, { entries: [...existing, ...newEntries] });
}

export async function addEntryToWorkout(
  userId: string,
  workoutId: string,
  entry: WorkoutEntry
): Promise<void> {
  await addEntriesToWorkout(userId, workoutId, [entry]);
}

export async function updateWorkoutEntries(
  userId: string,
  workoutId: string,
  entries: WorkoutEntry[]
): Promise<void> {
  if (entries.length === 0) {
    await deleteDoc(doc(db(), 'users', userId, 'workouts', workoutId));
    return;
  }
  await updateDoc(doc(db(), 'users', userId, 'workouts', workoutId), { entries });
}

export async function completeWorkout(userId: string, workoutId: string): Promise<void> {
  await updateDoc(doc(db(), 'users', userId, 'workouts', workoutId), { completed: true });
}

export async function deleteWorkout(userId: string, workoutId: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', userId, 'workouts', workoutId));
}

// ─── Templates ───────────────────────────────────────────────

export async function getTemplates(userId: string): Promise<Template[]> {
  const snap = await getDocs(
    query(collection(db(), 'users', userId, 'templates'), orderBy('order', 'asc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Template));
}

export async function createTemplate(userId: string, template: Omit<Template, 'id'>): Promise<string> {
  const ref = doc(collection(db(), 'users', userId, 'templates'));
  await setDoc(ref, template);
  return ref.id;
}

export async function updateTemplate(userId: string, id: string, data: Partial<Template>): Promise<void> {
  await updateDoc(doc(db(), 'users', userId, 'templates', id), data);
}

export async function deleteTemplate(userId: string, id: string): Promise<void> {
  await deleteDoc(doc(db(), 'users', userId, 'templates', id));
}

// ─── Settings ────────────────────────────────────────────────

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const snap = await getDoc(doc(db(), 'users', userId, 'settings', 'current'));
  if (!snap.exists()) return null;
  return snap.data() as UserSettings;
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<void> {
  await setDoc(doc(db(), 'users', userId, 'settings', 'current'), settings);
}

// ─── Helpers ─────────────────────────────────────────────────

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function generateId(): string {
  return doc(collection(db(), '_')).id;
}
