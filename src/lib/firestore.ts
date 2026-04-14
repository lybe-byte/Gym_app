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

// ─── Outdoor Activities (Runs) ───────────────────────────────

import type { Run, RoutePoint, StepData } from '@/types';
import { runTransaction, writeBatch } from 'firebase/firestore';

export async function saveRun(userId: string, run: Run, routePoints: RoutePoint[]): Promise<void> {
  const batch = writeBatch(db());
  const runRef = doc(db(), 'users', userId, 'runs', run.id);
  batch.set(runRef, run);

  routePoints.forEach((point) => {
    const pointRef = doc(db(), 'users', userId, 'runs', run.id, 'routePoints', point.id);
    batch.set(pointRef, point);
  });

  await batch.commit();
}

export async function getRuns(userId: string): Promise<Run[]> {
  const snap = await getDocs(
    query(collection(db(), 'users', userId, 'runs'), orderBy('createdAt', 'desc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Run));
}

export async function getRoutePoints(userId: string, runId: string): Promise<RoutePoint[]> {
  const snap = await getDocs(
    query(collection(db(), 'users', userId, 'runs', runId, 'routePoints'), orderBy('timestamp', 'asc'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoutePoint));
}

export async function getRunById(userId: string, runId: string): Promise<Run | null> {
  const snap = await getDoc(doc(db(), 'users', userId, 'runs', runId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Run;
}

export async function deleteRun(userId: string, runId: string): Promise<void> {
  // Delete all routePoints first
  const rpSnap = await getDocs(collection(db(), 'users', userId, 'runs', runId, 'routePoints'));
  const batch = writeBatch(db());
  rpSnap.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(doc(db(), 'users', userId, 'runs', runId));
  await batch.commit();
}

// ─── Health / Steps ──────────────────────────────────────────

export async function saveStepData(userId: string, stepData: StepData): Promise<void> {
  const ref = doc(db(), 'users', userId, 'health', stepData.date); // using date as ID for easy fetching
  await setDoc(ref, stepData, { merge: true });
}

export async function getStepDataForDate(userId: string, date: string): Promise<StepData | null> {
  const snap = await getDoc(doc(db(), 'users', userId, 'health', date));
  if (!snap.exists()) return null;
  return snap.data() as StepData;
}

export async function getWeeklyStepData(userId: string, startDate: string, endDate: string): Promise<StepData[]> {
  // Simple fetch all and filter since we don't have thousands or complex querying immediately
  // Or we can query by document IDs if we pad them nicely, but let's just get the health collection
  const snap = await getDocs(collection(db(), 'users', userId, 'health'));
  return snap.docs
    .map((d) => d.data() as StepData)
    .filter((s) => s.date >= startDate && s.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}
