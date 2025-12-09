/**
 * Animation Class
 * A simple animation class that uses the global ticker
 */

import { ticker } from './AnimationTicker';

export type EasingFunction = (t: number) => number;

// Common easing functions
export const Easing = {
  linear: (t: number): number => t,

  easeInQuad: (t: number): number => t * t,
  easeOutQuad: (t: number): number => t * (2 - t),
  easeInOutQuad: (t: number): number => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

  easeInCubic: (t: number): number => t * t * t,
  easeOutCubic: (t: number): number => (--t) * t * t + 1,
  easeInOutCubic: (t: number): number =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,

  easeInQuart: (t: number): number => t * t * t * t,
  easeOutQuart: (t: number): number => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number): number =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,

  easeInExpo: (t: number): number => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t: number): number => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t: number): number => {
    if (t === 0 || t === 1) return t;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
};

interface AnimationConfig<T> {
  from: T;
  to: T;
  duration: number;
  easing?: EasingFunction;
  onUpdate: (value: T) => void;
  onComplete?: () => void;
}

export class Animation<T = number> {
  private from: T;
  private to: T;
  private duration: number;
  private easing: EasingFunction;
  private onUpdate: (value: T) => void;
  private onComplete?: () => void;
  private startTime: number | null = null;
  private isActive = false;

  constructor(config: AnimationConfig<T>) {
    this.from = config.from;
    this.to = config.to;
    this.duration = config.duration;
    this.easing = config.easing || Easing.linear;
    this.onUpdate = config.onUpdate;
    this.onComplete = config.onComplete;
  }

  /**
   * Start the animation
   */
  start = (): void => {
    if (this.isActive) return;

    this.isActive = true;
    this.startTime = null;
    ticker.add(this.update);
  };

  /**
   * Stop the animation
   */
  stop = (): void => {
    if (!this.isActive) return;

    this.isActive = false;
    ticker.remove(this.update);
  };

  /**
   * Update callback called on every frame
   */
  private update = (timestamp: number): void => {
    if (!this.startTime) {
      this.startTime = timestamp;
    }

    const elapsed = timestamp - this.startTime;
    const progress = Math.min(elapsed / this.duration, 1);
    const easedProgress = this.easing(progress);

    // Interpolate the value
    const value = this.interpolate(this.from, this.to, easedProgress);
    this.onUpdate(value);

    // Complete if done
    if (progress >= 1) {
      this.complete();
    }
  };

  /**
   * Interpolate between two values
   */
  private interpolate = (from: T, to: T, progress: number): T => {
    // Handle numbers
    if (typeof from === 'number' && typeof to === 'number') {
      return (from + (to - from) * progress) as T;
    }

    // Handle objects (for multiple properties)
    if (typeof from === 'object' && typeof to === 'object' && from !== null && to !== null) {
      const result = { ...from };
      for (const key in to) {
        const fromVal = from[key];
        const toVal = to[key];
        if (typeof fromVal === 'number' && typeof toVal === 'number') {
          (result as any)[key] = fromVal + (toVal - fromVal) * progress;
        }
      }
      return result;
    }

    // Fallback
    return progress < 1 ? from : to;
  };

  /**
   * Complete the animation
   */
  private complete = (): void => {
    this.stop();
    if (this.onComplete) {
      this.onComplete();
    }
  };

  /**
   * Restart the animation
   */
  restart = (): void => {
    this.stop();
    this.start();
  };
}

export default Animation;
