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

export function useLocationTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [distance, setDistance] = useState(0);          // metres
  const [currentSpeed, setCurrentSpeed] = useState(0);  // km/h
  const [averageSpeed, setAverageSpeed] = useState(0);  // km/h
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const watchId = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);
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
    setCurrentSpeed(0);
    setAverageSpeed(0);
    setElapsedMs(0);
    accumulatedRef.current = 0;
    setIsPaused(false);
    setIsTracking(true);

    startTimer();

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;

        // Speed from GPS (m/s → km/h), fallback to 0
        const gpsSpeedKmh = speed != null && speed >= 0 ? speed * 3.6 : 0;
        setCurrentSpeed(gpsSpeedKmh);

        const newPoint: RoutePoint = {
          id: generateId(),
          latitude,
          longitude,
          timestamp: pos.timestamp,
          speed,
        };

        setRoute((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const seg = haversineM(last.latitude, last.longitude, latitude, longitude);
            if (seg > 1) {
              setDistance((d) => {
                const newDist = d + seg;
                // Recalculate average speed
                const elapsedSecs = (accumulatedRef.current + (Date.now() - startTimeRef.current)) / 1000;
                if (elapsedSecs > 0) {
                  setAverageSpeed((newDist / 1000) / (elapsedSecs / 3600));
                }
                return newDist;
              });
              return [...prev, newPoint];
            }
            return prev;
          }
          return [newPoint];
        });
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  }, [startTimer]);

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
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords;
        const gpsSpeedKmh = speed != null && speed >= 0 ? speed * 3.6 : 0;
        setCurrentSpeed(gpsSpeedKmh);

        const newPoint: RoutePoint = {
          id: generateId(),
          latitude,
          longitude,
          timestamp: pos.timestamp,
          speed,
        };

        setRoute((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const seg = haversineM(last.latitude, last.longitude, latitude, longitude);
            if (seg > 1) {
              setDistance((d) => {
                const newDist = d + seg;
                const elapsedSecs = (accumulatedRef.current + (Date.now() - startTimeRef.current)) / 1000;
                if (elapsedSecs > 0) {
                  setAverageSpeed((newDist / 1000) / (elapsedSecs / 3600));
                }
                return newDist;
              });
              return [...prev, newPoint];
            }
            return prev;
          }
          return [newPoint];
        });
      },
      (err) => setError(err.message),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  }, [startTimer]);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    stopTimer();
    // Freeze the elapsed time
    if (!isPaused) {
      accumulatedRef.current += Date.now() - startTimeRef.current;
      setElapsedMs(accumulatedRef.current);
    }
    setIsTracking(false);
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
    isPaused,
    route,
    distance,
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
