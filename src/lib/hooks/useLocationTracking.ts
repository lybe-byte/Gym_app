import { useState, useEffect, useCallback, useRef } from 'react';
import type { RoutePoint } from '@/types';
import { generateId } from '@/lib/firestore';

// Haversine formula — returns distance in meters
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000; // Earth radius in metres
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMET(speedKmh: number): number {
  if (speedKmh < 0.5) return 1.0;
  if (speedKmh < 5.0) return 3.5;   // Walking
  if (speedKmh < 8.0) return 7.0;   // Jogging
  if (speedKmh < 12.0) return 10.0; // Running
  if (speedKmh < 16.0) return 13.5; // Fast running
  return 16.0;                     // Sprinting
}

export function useLocationTracking(userWeightKg: number = 75) {
  const [isTracking, setIsTracking] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [distance, setDistance] = useState(0);          // metres
  const [calories, setCalories] = useState(0);          // kcal
  const [currentSpeed, setCurrentSpeed] = useState(0);  // km/h
  const [averageSpeed, setAverageSpeed] = useState(0);  // km/h
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  // ── Timer ──────────────────────────────────────────────
  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsedMs(accumulatedRef.current + (Date.now() - startTimeRef.current));
    }, 250);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ── Controls ───────────────────────────────────────────
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setError(null);
    setRoute([]);
    setDistance(0);
    setCalories(0);
    setCurrentSpeed(0);
    setAverageSpeed(0);
    setElapsedMs(0);
    accumulatedRef.current = 0;
    setIsPaused(false);
    setIsTracking(true);
    setIsLocating(true); // Start in locating phase

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        const timestamp = pos.timestamp;

        // 1. Accuracy Check for Starting Point
        // If we're still 'locating', we wait for accuracy < 30m
        if (isLocating) {
          if (accuracy != null && accuracy > 50) {
            // Signal is too weak, keep waiting
            return;
          }
          // Signal is good! Start official tracking
          setIsLocating(false);
          startTimer();
          lastTimestampRef.current = timestamp;
        }

        // 2. Process Point
        const gpsSpeedKmh = speed != null && speed >= 0 ? speed * 3.6 : 0;
        setCurrentSpeed(gpsSpeedKmh);

        const newPoint: RoutePoint = {
          id: generateId(),
          latitude,
          longitude,
          timestamp,
          speed,
          accuracy,
        };

        setRoute((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const segDist = haversineM(last.latitude, last.longitude, latitude, longitude);

            // Filter out jitter (less than 1m)
            if (segDist > 1.5) {
              // 3. Calorie Calculation
              const timeDeltaMs = timestamp - lastTimestampRef.current;
              if (timeDeltaMs > 0) {
                const met = getMET(gpsSpeedKmh);
                const hrs = timeDeltaMs / 3_600_000;
                const burned = met * userWeightKg * hrs;
                setCalories((c) => c + burned);
              }
              lastTimestampRef.current = timestamp;

              // 4. Distance and Average Speed
              setDistance((d) => {
                const newDist = d + segDist;
                const currentElapsed = accumulatedRef.current + (Date.now() - startTimeRef.current);
                const elapsedSecs = currentElapsed / 1000;
                if (elapsedSecs > 0) {
                  setAverageSpeed((newDist / 1000) / (elapsedSecs / 3600));
                }
                return newDist;
              });

              return [...prev, newPoint];
            }
            return prev;
          }
          
          // First point
          lastTimestampRef.current = timestamp;
          return [newPoint];
        });
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }, [startTimer, isLocating, userWeightKg]);

  const pauseTracking = useCallback(() => {
    setIsPaused(true);
    accumulatedRef.current += Date.now() - startTimeRef.current;
    stopTimer();
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, [stopTimer]);

  const resumeTracking = useCallback(() => {
    setIsPaused(false);
    startTimer();
    
    // When resuming, we don't necessarily need to re-locate, but we should reset the timestamp
    lastTimestampRef.current = Date.now();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, accuracy } = pos.coords;
        const timestamp = pos.timestamp;

        const gpsSpeedKmh = speed != null && speed >= 0 ? speed * 3.6 : 0;
        setCurrentSpeed(gpsSpeedKmh);

        const newPoint: RoutePoint = {
          id: generateId(),
          latitude,
          longitude,
          timestamp,
          speed,
          accuracy,
        };

        setRoute((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const segDist = haversineM(last.latitude, last.longitude, latitude, longitude);

            if (segDist > 1.5) {
              const timeDeltaMs = timestamp - lastTimestampRef.current;
              if (timeDeltaMs > 0) {
                const met = getMET(gpsSpeedKmh);
                const hrs = timeDeltaMs / 3_600_000;
                const burned = met * userWeightKg * hrs;
                setCalories((c) => c + burned);
              }
              lastTimestampRef.current = timestamp;

              setDistance((d) => {
                const newDist = d + segDist;
                const currentElapsed = accumulatedRef.current + (Date.now() - startTimeRef.current);
                const elapsedSecs = currentElapsed / 1000;
                if (elapsedSecs > 0) {
                  setAverageSpeed((newDist / 1000) / (elapsedSecs / 3600));
                }
                return newDist;
              });
              return [...prev, newPoint];
            }
            return prev;
          }
          lastTimestampRef.current = timestamp;
          return [newPoint];
        });
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }, [startTimer, userWeightKg]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    stopTimer();
    if (!isPaused) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      setElapsedMs(accumulatedRef.current);
    }
    setIsTracking(false);
    setIsLocating(false);
    setIsPaused(false);
    setCurrentSpeed(0);
  }, [stopTimer, isPaused]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    isTracking,
    isLocating,
    isPaused,
    route,
    distance,
    calories,
    currentSpeed,
    averageSpeed,
    elapsedMs,
    error,
    startTracking,
    pauseTracking,
    resumeTracking,
    stopTracking,
  };
}
