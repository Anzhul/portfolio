/**
 * React hook for using the animation ticker
 */

import { useEffect, useRef } from 'react';
import { ticker } from '../utils/AnimationTicker';
import { Animation, Easing, type EasingFunction } from '../utils/Animation';

/**
 * Hook to add a callback to the global ticker
 * Automatically removes the callback when the component unmounts
 */
export function useTicker(
  callback: (timestamp: number, deltaTime: number) => void,
  enabled = true
) {
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const wrappedCallback = (timestamp: number, deltaTime: number) => {
      callbackRef.current(timestamp, deltaTime);
    };

    ticker.add(wrappedCallback);

    return () => {
      ticker.remove(wrappedCallback);
    };
  }, [enabled]);
}

/**
 * Hook to create and control an animation
 */
export function useAnimationController<T = number>() {
  const animationRef = useRef<Animation<T> | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, []);

  const animate = (config: {
    from: T;
    to: T;
    duration: number;
    easing?: EasingFunction;
    onUpdate: (value: T) => void;
    onComplete?: () => void;
  }) => {
    // Stop any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
    }

    // Create and start new animation
    animationRef.current = new Animation(config);
    animationRef.current.start();

    return animationRef.current;
  };

  const stop = () => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
  };

  return { animate, stop };
}

export { Easing };
