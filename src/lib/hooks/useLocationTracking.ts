import { useState, useEffect, useCallback, useRef } from 'react';
import { RoutePoint } from '@/types';
// We'll just generate an ID client-side mathematically or import from firestore
import { generateId } from '@/lib/firestore';

// Haversine formula
function getDistanceFromLatLonInM(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Radius of the earth in m
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in m
}

export function useLocationTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [distance, setDistance] = useState(0); // in meters
  const [error, setError] = useState<string | null>(null);
  const watchId = useRef<number | null>(null);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }
    setError(null);
    setRoute([]);
    setDistance(0);
    setIsTracking(true);

    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed } = position.coords;
        const newPoint: RoutePoint = {
          id: generateId(),
          latitude,
          longitude,
          timestamp: position.timestamp,
          speed,
        };

        setRoute((prev) => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            const dist = getDistanceFromLatLonInM(
              last.latitude,
              last.longitude,
              latitude,
              longitude
            );
            // filter out crazy jumps (e.g. > 100m in a few seconds) or add them
            if (dist > 1) { // minimum 1m change
              setDistance((d) => d + dist);
              return [...prev, newPoint];
            }
            return prev;
          }
          return [newPoint];
        });
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const stopTracking = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setIsTracking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  return { isTracking, route, distance, error, startTracking, stopTracking };
}
