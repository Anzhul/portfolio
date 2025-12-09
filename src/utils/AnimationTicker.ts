/**
 * Global Animation Ticker
 * A singleton that manages a single requestAnimationFrame loop for all animations
 */

type TickerCallback = (timestamp: number, deltaTime: number) => void;

class AnimationTicker {
  private callbacks: Set<TickerCallback>;
  private isRunning: boolean;
  private rafId: number | null;
  private lastTimestamp: number;
  private isPaused: boolean;

  constructor() {
    this.callbacks = new Set();
    this.isRunning = false;
    this.rafId = null;
    this.lastTimestamp = 0;
    this.isPaused = false;

    // Pause animations when tab is hidden to save resources
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * Add a callback to the ticker
   * The callback will be called on every frame with (timestamp, deltaTime)
   */
  add = (callback: TickerCallback): void => {
    this.callbacks.add(callback);
    if (!this.isRunning && !this.isPaused) {
      this.start();
    }
  };

  /**
   * Remove a callback from the ticker
   */
  remove = (callback: TickerCallback): void => {
    this.callbacks.delete(callback);
    if (this.callbacks.size === 0) {
      this.stop();
    }
  };

  /**
   * Main animation loop
   */
  private tick = (timestamp: number): void => {
    // Calculate delta time (time since last frame)
    const deltaTime = this.lastTimestamp ? timestamp - this.lastTimestamp : 0;
    this.lastTimestamp = timestamp;

    // Call all registered callbacks
    this.callbacks.forEach((callback) => {
      try {
        callback(timestamp, deltaTime);
      } catch (error) {
        console.error('Error in animation callback:', error);
      }
    });

    // Continue the loop if there are active callbacks
    if (this.callbacks.size > 0 && !this.isPaused) {
      this.rafId = requestAnimationFrame(this.tick);
    } else {
      this.isRunning = false;
    }
  };

  /**
   * Start the ticker
   */
  private start = (): void => {
    if (!this.isRunning && !this.isPaused) {
      this.isRunning = true;
      this.lastTimestamp = 0; // Reset to avoid large initial delta
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  /**
   * Stop the ticker
   */
  private stop = (): void => {
    this.isRunning = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  /**
   * Pause all animations (useful for tab visibility changes)
   */
  pause = (): void => {
    this.isPaused = true;
    this.stop();
  };

  /**
   * Resume all animations
   */
  resume = (): void => {
    this.isPaused = false;
    if (this.callbacks.size > 0) {
      this.start();
    }
  };

  /**
   * Handle tab visibility changes
   */
  private handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.pause();
    } else {
      this.resume();
    }
  };

  /**
   * Get the number of active animations
   */
  get activeCount(): number {
    return this.callbacks.size;
  }

  /**
   * Clean up event listeners (call this on app unmount if needed)
   */
  destroy = (): void => {
    this.stop();
    this.callbacks.clear();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  };
}

// Export a singleton instance
export const ticker = new AnimationTicker();

// Export the class if needed for testing or custom instances
export default AnimationTicker;
