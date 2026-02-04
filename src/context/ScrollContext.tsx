import { createContext, useContext, useRef, useMemo, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import { ticker } from '../utils/AnimationTicker'

/**
 * ScrollContext - GSAP-like scroll tracking for 3D animations
 *
 * Uses ref-based storage to avoid re-renders on frequent scroll updates.
 * Components can subscribe to throttled updates or use triggers for
 * timeline-based animations.
 *
 * Similar to GSAP ScrollTrigger:
 * - Tracks scroll progress (0-1)
 * - Supports triggers with start/end thresholds
 * - Provides scrubbed progress for smooth 3D animations
 */

export interface ScrollTrigger {
  id: string
  start: number          // Progress (0-1) when trigger becomes active
  end: number            // Progress (0-1) when trigger completes
  onEnter?: () => void   // Callback when entering trigger zone
  onLeave?: () => void   // Callback when leaving trigger zone (forward)
  onEnterBack?: () => void  // Callback when re-entering (scrolling up)
  onLeaveBack?: () => void  // Callback when leaving backwards
}

export interface TriggerState {
  isActive: boolean      // Currently within the trigger zone
  progress: number       // 0-1 progress within the trigger zone
  direction: 'forward' | 'backward' | null
}

export interface ScrollState {
  scrollY: number        // Raw scroll position in pixels
  progress: number       // 0-1 scroll progress of the container
  smoothProgress: number // Smoothed progress (interpolated via ticker)
  velocity: number       // Scroll velocity (pixels per frame)
  direction: 'up' | 'down' | null
}

export interface ScrollContextType {
  // Get current state (non-reactive)
  getState: () => ScrollState

  // Attach to a scrollable container
  attach: (element: HTMLElement | null) => void

  // Detach from current container
  detach: () => void

  // Update smoothing factor (0-1, higher = faster smoothing)
  setSmoothingFactor: (factor: number) => void

  // Trigger management
  registerTrigger: (trigger: ScrollTrigger) => () => void
  getTriggerState: (id: string) => TriggerState | null

  // Subscribe to state changes
  subscribe: (listener: () => void) => () => void

  // Subscribe to a specific trigger
  subscribeTrigger: (id: string, listener: (state: TriggerState) => void) => () => void
}

const ScrollContext = createContext<ScrollContextType | undefined>(undefined)

// Throttle helper
function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: number | null = null
  let lastRan: number = 0

  return ((...args: any[]) => {
    const now = Date.now()
    if (now - lastRan >= delay) {
      func(...args)
      lastRan = now
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        func(...args)
        lastRan = Date.now()
      }, delay - (now - lastRan))
    }
  }) as T
}

export function ScrollProvider({ children }: { children: ReactNode }) {
  // Scroll state stored in ref (no re-renders on scroll)
  const stateRef = useRef<ScrollState>({
    scrollY: 0,
    progress: 0,
    smoothProgress: 0,
    velocity: 0,
    direction: null,
  })

  // Container reference
  const containerRef = useRef<HTMLElement | null>(null)

  // Smoothing factor (0-1, higher = faster catch-up)
  const smoothingFactorRef = useRef(0.1)

  // Registered triggers
  const triggersRef = useRef<Map<string, ScrollTrigger>>(new Map())

  // Trigger states
  const triggerStatesRef = useRef<Map<string, TriggerState>>(new Map())

  // Subscribers
  const listenersRef = useRef<Set<() => void>>(new Set())
  const triggerListenersRef = useRef<Map<string, Set<(state: TriggerState) => void>>>(new Map())

  // Previous scroll for velocity calculation
  const prevScrollRef = useRef(0)

  // Throttled notification (100ms like CameraContext)
  const notifyListeners = useMemo(
    () => throttle(() => {
      listenersRef.current.forEach(listener => listener())
    }, 100),
    []
  )

  // Notify trigger-specific listeners
  const notifyTriggerListeners = useCallback((id: string, state: TriggerState) => {
    const listeners = triggerListenersRef.current.get(id)
    if (listeners) {
      listeners.forEach(listener => listener(state))
    }
  }, [])

  // Update trigger states based on current progress
  const updateTriggers = useCallback((progress: number, direction: 'up' | 'down' | null) => {
    triggersRef.current.forEach((trigger, id) => {
      const prevState = triggerStatesRef.current.get(id)
      const wasActive = prevState?.isActive ?? false

      // Check if within trigger zone
      const isActive = progress >= trigger.start && progress <= trigger.end

      // Calculate progress within the trigger (0-1)
      let triggerProgress = 0
      if (isActive) {
        const range = trigger.end - trigger.start
        triggerProgress = range > 0 ? (progress - trigger.start) / range : 1
      } else if (progress > trigger.end) {
        triggerProgress = 1
      }

      const newState: TriggerState = {
        isActive,
        progress: triggerProgress,
        direction: direction === 'down' ? 'forward' : direction === 'up' ? 'backward' : null,
      }

      // Fire callbacks on state transitions
      if (!wasActive && isActive) {
        // Entering trigger zone
        if (direction === 'down') {
          trigger.onEnter?.()
        } else if (direction === 'up') {
          trigger.onEnterBack?.()
        }
      } else if (wasActive && !isActive) {
        // Leaving trigger zone
        if (direction === 'down') {
          trigger.onLeave?.()
        } else if (direction === 'up') {
          trigger.onLeaveBack?.()
        }
      }

      triggerStatesRef.current.set(id, newState)
      notifyTriggerListeners(id, newState)
    })
  }, [notifyTriggerListeners])

  // Smoothing animation via ticker
  const smoothingTickerRef = useRef<((timestamp: number, deltaTime: number) => void) | null>(null)

  const startSmoothing = useCallback(() => {
    if (smoothingTickerRef.current) return

    const tickerCallback = (_timestamp: number, _deltaTime: number) => {
      const state = stateRef.current
      const diff = state.progress - state.smoothProgress

      // If difference is negligible, stop smoothing
      if (Math.abs(diff) < 0.0001) {
        state.smoothProgress = state.progress
        if (smoothingTickerRef.current) {
          ticker.remove(smoothingTickerRef.current)
          smoothingTickerRef.current = null
        }
        return
      }

      // Interpolate towards target
      state.smoothProgress += diff * smoothingFactorRef.current

      // Update triggers with smoothed progress
      updateTriggers(state.smoothProgress, state.direction)
      notifyListeners()
    }

    smoothingTickerRef.current = tickerCallback
    ticker.add(tickerCallback)
  }, [updateTriggers, notifyListeners])

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    const scrollY = container.scrollTop
    const scrollHeight = container.scrollHeight - container.clientHeight
    const progress = scrollHeight > 0 ? scrollY / scrollHeight : 0

    // Calculate velocity and direction
    const velocity = scrollY - prevScrollRef.current
    const direction: 'up' | 'down' | null = velocity > 0 ? 'down' : velocity < 0 ? 'up' : null
    prevScrollRef.current = scrollY

    // Update state
    stateRef.current = {
      scrollY,
      progress,
      smoothProgress: stateRef.current.smoothProgress,
      velocity,
      direction,
    }

    // Start or continue smoothing
    startSmoothing()
    notifyListeners()
  }, [startSmoothing, notifyListeners])

  // Context API
  const contextValue = useMemo<ScrollContextType>(
    () => ({
      getState: () => stateRef.current,

      attach: (element) => {
        // Detach from previous container
        if (containerRef.current) {
          containerRef.current.removeEventListener('scroll', handleScroll)
        }

        containerRef.current = element

        if (element) {
          element.addEventListener('scroll', handleScroll, { passive: true })
          // Initialize state
          handleScroll()
        }
      },

      detach: () => {
        if (containerRef.current) {
          containerRef.current.removeEventListener('scroll', handleScroll)
          containerRef.current = null
        }
        if (smoothingTickerRef.current) {
          ticker.remove(smoothingTickerRef.current)
          smoothingTickerRef.current = null
        }
      },

      setSmoothingFactor: (factor) => {
        smoothingFactorRef.current = Math.max(0.01, Math.min(1, factor))
      },

      registerTrigger: (trigger) => {
        triggersRef.current.set(trigger.id, trigger)
        // Initialize trigger state
        triggerStatesRef.current.set(trigger.id, {
          isActive: false,
          progress: 0,
          direction: null,
        })

        return () => {
          triggersRef.current.delete(trigger.id)
          triggerStatesRef.current.delete(trigger.id)
          triggerListenersRef.current.delete(trigger.id)
        }
      },

      getTriggerState: (id) => {
        return triggerStatesRef.current.get(id) ?? null
      },

      subscribe: (listener) => {
        listenersRef.current.add(listener)
        return () => {
          listenersRef.current.delete(listener)
        }
      },

      subscribeTrigger: (id, listener) => {
        if (!triggerListenersRef.current.has(id)) {
          triggerListenersRef.current.set(id, new Set())
        }
        triggerListenersRef.current.get(id)!.add(listener)

        return () => {
          const listeners = triggerListenersRef.current.get(id)
          if (listeners) {
            listeners.delete(listener)
          }
        }
      },
    }),
    [handleScroll]
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (containerRef.current) {
        containerRef.current.removeEventListener('scroll', handleScroll)
      }
      if (smoothingTickerRef.current) {
        ticker.remove(smoothingTickerRef.current)
      }
    }
  }, [handleScroll])

  return <ScrollContext.Provider value={contextValue}>{children}</ScrollContext.Provider>
}

// Non-reactive access to scroll context
export function useScroll() {
  const context = useContext(ScrollContext)
  if (context === undefined) {
    throw new Error('useScroll must be used within a ScrollProvider')
  }
  return context
}

// Reactive hook for components that need re-renders on scroll
export function useScrollState() {
  const scroll = useScroll()
  const [state, setState] = useState<ScrollState>(scroll.getState())

  useEffect(() => {
    const unsubscribe = scroll.subscribe(() => {
      setState({ ...scroll.getState() })
    })
    return unsubscribe
  }, [scroll])

  return state
}

/**
 * useScrollTrigger - GSAP-like scroll trigger hook
 *
 * @param config - Trigger configuration
 * @returns Current trigger state with progress (0-1) for animations
 *
 * @example
 * // Animate 3D object rotation based on scroll
 * const { progress, isActive } = useScrollTrigger({
 *   id: 'boat-rotate',
 *   start: 0.2,  // Start at 20% scroll
 *   end: 0.6,    // End at 60% scroll
 *   onEnter: () => console.log('Animation started'),
 * })
 *
 * // Use progress (0-1) to control rotation
 * meshRef.current.rotation.y = progress * Math.PI * 2
 */
export function useScrollTrigger(config: ScrollTrigger): TriggerState {
  const scroll = useScroll()
  const [state, setState] = useState<TriggerState>({
    isActive: false,
    progress: 0,
    direction: null,
  })

  useEffect(() => {
    // Register the trigger
    const unregister = scroll.registerTrigger(config)

    // Subscribe to trigger updates
    const unsubscribe = scroll.subscribeTrigger(config.id, (newState) => {
      setState(newState)
    })

    return () => {
      unregister()
      unsubscribe()
    }
  }, [scroll, config.id, config.start, config.end])

  return state
}

/**
 * useScrollProgress - Simple hook for raw scroll progress
 *
 * @returns Current smooth scroll progress (0-1)
 */
export function useScrollProgress(): number {
  const scroll = useScroll()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const unsubscribe = scroll.subscribe(() => {
      setProgress(scroll.getState().smoothProgress)
    })
    return unsubscribe
  }, [scroll])

  return progress
}

/**
 * useScrollAnimation - Hook for frame-based scroll animations
 *
 * Uses the ticker for smooth animations without React re-renders.
 * Perfect for 3D object transforms.
 *
 * @param callback - Called every frame with current scroll state
 *
 * @example
 * useScrollAnimation((state) => {
 *   if (meshRef.current) {
 *     meshRef.current.rotation.y = state.smoothProgress * Math.PI
 *     meshRef.current.position.y = state.smoothProgress * 5
 *   }
 * })
 */
export function useScrollAnimation(callback: (state: ScrollState) => void) {
  const scroll = useScroll()
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    const tickerCallback = () => {
      callbackRef.current(scroll.getState())
    }

    ticker.add(tickerCallback)
    return () => {
      ticker.remove(tickerCallback)
    }
  }, [scroll])
}
