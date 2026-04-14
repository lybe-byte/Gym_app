import { useState, useEffect, useCallback, useRef } from 'react';

// Free step counter relying on DeviceMotionEvent since actual Native Pedometer needs a plugin
export function usePedometer() {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  
  const lastZ = useRef(0);
  const lastTime = useRef(0);
  const threshold = 1.2; // roughly tune for walking
  const debounceTimeMs = 300;

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    if (!event.accelerationIncludingGravity) return;
    const { z } = event.accelerationIncludingGravity;
    if (z === null) return;

    if (isAvailable === null) setIsAvailable(true);

    const currentTime = Date.now();
    const deltaZ = Math.abs(z - lastZ.current);
    
    if (deltaZ > threshold && currentTime - lastTime.current > debounceTimeMs) {
      setSteps((prev) => prev + 1);
      lastTime.current = currentTime;
    }
    
    lastZ.current = z;
  }, [isAvailable]);

  useEffect(() => {
    // Check if permission is needed (iOS 13+)
    // @ts-ignore
    if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
      // Must be called from user interaction, we'll let UI handle calling requestPermission manually first
    } else {
      // Browsers where it's immediately available without user interaction
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.addEventListener('devicemotion', handleMotion as any);
      setIsAvailable(true);
    }
    
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      window.removeEventListener('devicemotion', handleMotion as any);
    };
  }, [handleMotion]);

  const requestPermission = async () => {
    try {
      // @ts-ignore
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        // @ts-ignore
        const permission = await DeviceMotionEvent.requestPermission();
        if (permission === 'granted') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          window.addEventListener('devicemotion', handleMotion as any);
          setIsAvailable(true);
        } else {
          setIsAvailable(false);
        }
      }
    } catch (e) {
      console.error(e);
      setIsAvailable(false);
    }
  };

  return { steps, isAvailable, requestPermission, setSteps };
}
