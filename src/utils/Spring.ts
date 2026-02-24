/**
 * Time-based spring animation with exponential decay easing.
 *
 * Easing curve: `1 - exp(-progress * stiffness)`
 * With default stiffness (6.5), the animation is ~96% complete at the halfway
 * point, producing a fast attack and smooth deceleration.
 *
 * Based on the spring implementation from iiif-viewer.
 */

export interface SpringConfig {
  stiffness?: number
  animationTime?: number
  exponential?: boolean
  initial?: number
}

export class Spring {
  private _current: { value: number; time: number }
  private _target: { value: number; time: number }
  private _start: { value: number; time: number }
  private _stiffness: number
  private _animationTime: number
  private _exponential: boolean

  constructor(config: SpringConfig = {}) {
    this._stiffness = config.stiffness ?? 6.5
    this._animationTime = config.animationTime ?? 1.25
    this._exponential = config.exponential ?? false

    const initial = config.initial ?? 0
    const now = performance.now()

    this._current = { value: initial, time: now }
    this._target = { value: initial, time: now }
    this._start = { value: initial, time: now }
  }

  /** Set target and animate toward it from the current value. */
  springTo(value: number): void {
    // Only sync time when idle — if the spring is active, current.time was set
    // by the last update() call (~16ms ago), giving meaningful elapsed time.
    // Without this guard, continuous springTo() calls zero out elapsed time
    // every frame and the spring makes no progress.
    if (this._current.time >= this._target.time) {
      this._current.time = performance.now()
    }
    this._start.value = this._current.value
    this._start.time = this._current.time
    this._target.value = value
    this._target.time = this._start.time + this._animationTime * 1000
  }

  /** Jump immediately to a value with no animation. */
  resetTo(value: number): void {
    this._current.value = value
    this._start.value = value
    this._target.value = value
    this._target.time = this._current.time
  }

  /** Shift start, target, and current by the same delta. */
  shiftBy(delta: number): void {
    this._start.value += delta
    this._target.value += delta
    this._current.value += delta
  }

  /**
   * Advance the spring for the current frame.
   * @returns `true` if still animating, `false` if at rest.
   */
  update(): boolean {
    this._current.time = performance.now()

    if (this._current.time >= this._target.time) {
      this._current.value = this._target.value
      return false
    }

    const elapsed = this._current.time - this._start.time
    const duration = this._target.time - this._start.time

    if (duration === 0) {
      this._current.value = this._target.value
      return false
    }

    let progress = elapsed / duration
    progress = 1 - Math.exp(-progress * this._stiffness)

    if (this._exponential) {
      const logStart = Math.log(this._start.value)
      const logTarget = Math.log(this._target.value)
      this._current.value = Math.exp(logStart + (logTarget - logStart) * progress)
    } else {
      this._current.value = this._start.value + (this._target.value - this._start.value) * progress
    }

    return true
  }

  /** Current interpolated value. */
  get value(): number {
    return this._current.value
  }

  /** Current target value. */
  get target(): number {
    return this._target.value
  }

  /** Whether the spring has reached its target. */
  get isAtRest(): boolean {
    return this._current.value === this._target.value
  }
}
