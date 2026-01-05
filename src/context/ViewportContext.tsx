import { createContext, useContext, useState, useEffect, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'

// Universal viewport/breakpoint context
// Tracks window width and provides breakpoint utilities
// Updates all components on window resize
// Accessible by all components including lightweight pages

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide'

// Configurable breakpoint thresholds (in pixels)
export const BREAKPOINTS = {
  mobile: 0,      // 0-767px
  tablet: 768,    // 768-1023px
  desktop: 1024,  // 1024-1439px
  wide: 1440,     // 1440px+
} as const

interface ViewportContextType {
  width: number
  height: number
  breakpoint: Breakpoint

  // Convenience helpers
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  isWide: boolean

  // Min-width queries
  isTabletUp: boolean   // >= tablet
  isDesktopUp: boolean  // >= desktop

  // Max-width queries
  isMobileOnly: boolean     // < tablet
  isTabletDown: boolean     // < desktop
  isDesktopDown: boolean    // < wide
}

const ViewportContext = createContext<ViewportContextType | undefined>(undefined)

// Get current breakpoint from width
function getBreakpoint(width: number): Breakpoint {
  if (width < BREAKPOINTS.tablet) return 'mobile'
  if (width < BREAKPOINTS.desktop) return 'tablet'
  if (width < BREAKPOINTS.wide) return 'desktop'
  return 'wide'
}

// Calculate all viewport values from width and height
function getViewportState(width: number, height: number): ViewportContextType {
  const breakpoint = getBreakpoint(width)

  return {
    width,
    height,
    breakpoint,

    // Exact breakpoint matches
    isMobile: breakpoint === 'mobile',
    isTablet: breakpoint === 'tablet',
    isDesktop: breakpoint === 'desktop',
    isWide: breakpoint === 'wide',

    // Min-width queries (mobile-first approach)
    isTabletUp: width >= BREAKPOINTS.tablet,
    isDesktopUp: width >= BREAKPOINTS.desktop,

    // Max-width queries (desktop-first approach)
    isMobileOnly: width < BREAKPOINTS.tablet,
    isTabletDown: width < BREAKPOINTS.desktop,
    isDesktopDown: width < BREAKPOINTS.wide,
  }
}

export function ViewportProvider({ children }: { children: ReactNode }) {
  // Store for external subscriptions (allows non-reactive access if needed)
  const [store] = useState(() => {
    let state: ViewportContextType
    let listeners = new Set<() => void>()

    // Initialize state
    if (typeof window !== 'undefined') {
      state = getViewportState(window.innerWidth, window.innerHeight)
    } else {
      // SSR fallback: assume desktop
      state = getViewportState(1024, 768)
    }

    return {
      getState: () => state,
      setState: (newState: ViewportContextType) => {
        state = newState
        listeners.forEach(listener => listener())
      },
      subscribe: (listener: () => void) => {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
    }
  })

  // Listen for viewport changes
  useEffect(() => {
    const handleResize = () => {
      const newState = getViewportState(window.innerWidth, window.innerHeight)
      store.setState(newState)
    }

    window.addEventListener('resize', handleResize)

    // Initial sync
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [store])

  // Subscribe to store for reactive updates
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    // SSR snapshot
    () => getViewportState(1024, 768)
  )

  return (
    <ViewportContext.Provider value={state}>
      {children}
    </ViewportContext.Provider>
  )
}

// React hook for components that need reactive viewport updates
export function useViewport() {
  const context = useContext(ViewportContext)
  if (context === undefined) {
    throw new Error('useViewport must be used within a ViewportProvider')
  }
  return context
}
