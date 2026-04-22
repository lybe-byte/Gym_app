import { useState, useEffect, useCallback, useRef } from 'react';

// Free step counter relying on DeviceMotionEvent since actual Native Pedometer needs a plugin
export function usePedometer() {
  const [steps, setSteps] = useState(0);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  
  const lastTime = useRef(0);
  const debounceTimeMs = 300;

  const handleMotion = useCallback((event: DeviceMotionEvent) => {
    // 1. Try to use acceleration (without gravity) if available as it's cleaner
    // 2. Fall back to accelerationIncludingGravity
    const accel = event.acceleration || event.accelerationIncludingGravity;
    if (!accel) return;

    const { x, y, z } = accel;
    if (x === null || y === null || z === null) return;

    if (isAvailable !== true) setIsAvailable(true);

    // Calculate magnitude
    const magnitude = Math.sqrt(x * x + y * y + z * z);
    
    const currentTime = Date.now();
    
    // threshold logic:
    // If using 'acceleration', we expect values around 0 when stationary and > 2-5 during a step.
    // If using 'accelerationIncludingGravity', we expect values around 9.8 when stationary.
    const stepThreshold = event.acceleration ? 2.5 : 12.5;

    if (magnitude > stepThreshold && currentTime - lastTime.current > debounceTimeMs) {
      setSteps((prev) => prev + 1);
      lastTime.current = currentTime;
    }
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
