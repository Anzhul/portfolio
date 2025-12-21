import { createContext, useContext, useRef, useMemo, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

// Tracks camera position and settings for WebGL navigation component
// Uses ref-based storage to avoid re-renders on frequent updates (dragging/panning)
// Components can subscribe to throttled updates if they need reactivity

export interface CameraState {
  position: [number, number, number]
  rotation: [number, number, number]
  fov: number
  zoom: number
}

export interface CameraContextType {
  // Get current state (non-reactive, doesn't cause re-renders)
  getState: () => CameraState

  // Update state (updates ref immediately, notifies subscribers with throttle)
  setPosition: (position: [number, number, number]) => void
  setRotation: (rotation: [number, number, number]) => void
  setFov: (fov: number) => void
  setZoom: (zoom: number) => void

  // Subscribe to state changes (for components that need reactivity like minimap/URL handler)
  subscribe: (listener: () => void) => () => void
}

const CameraContext = createContext<CameraContextType | undefined>(undefined)

// Throttle helper - limits function calls to once per delay
// T-> whatever function you pass in
// (...args: any[]) => void -> function that takes any args and returns void
// (parameter) func: T -> the function to be throttled
// (parameter) delay: number -> delay in ms
// returns: T -> returns a function of the same type as func
function throttle<T extends (...args: any[]) => void>(func: T, delay: number): T {
  let timeoutId: number | null = null
  let lastRan: number = 0

  // Return a throttled version of the function
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

// Automatically passes everything between the tags as the children prop
export function CameraProvider({ children }: { children: ReactNode }) {
  // Store camera state in ref (doesn't cause re-renders when updated)
  const stateRef = useRef<CameraState>({
    position: [0, 0, 5],
    rotation: [0, 0, 0],
    fov: 75,
    zoom: 1,
  })

  // Store subscribers (components that want to be notified of changes vis callbacks)
  /*set.add(value) - not set[0] = value
    set.has(value) - not set[0]
    set.delete(value) */
  const listenersRef = useRef<Set<() => void>>(new Set())

  // Throttled notify function - only calls subscribers every 100ms
  const notifyListeners = useMemo(
    () =>
      throttle(() => {
        listenersRef.current.forEach(listener => listener())
      }, 100),
    []
  )

  // Create stable API object
  const contextValue = useMemo<CameraContextType>(
    () => ({
      getState: () => stateRef.current,

      setPosition: (position) => {
        stateRef.current.position = position
        notifyListeners()
      },

      setRotation: (rotation) => {
        stateRef.current.rotation = rotation
        notifyListeners()
      },

      setFov: (fov) => {
        stateRef.current.fov = fov
        notifyListeners()
      },

      setZoom: (zoom) => {
        stateRef.current.zoom = zoom
        notifyListeners()
      },

      subscribe: (listener) => {
        listenersRef.current.add(listener)
        return () => {
          listenersRef.current.delete(listener)
        }
      },
    }),
    [notifyListeners]
  )

  return <CameraContext.Provider value={contextValue}>{children}</CameraContext.Provider>
}

// Non-reactive access to camera context (for reading without subscribing)
export function useCamera() {
  const context = useContext(CameraContext)
  if (context === undefined) {
    throw new Error('useCamera must be used within a CameraProvider')
  }
  return context
}

// Reactive hook for components that need re-renders on camera changes
// (minimap, URL handler, etc.)
export function useCameraState() {
  // Custom hook that provides reactive access to camera state
  const camera = useCamera()
  //Get the camera API object (the non-reactive context with all the functions).
  const [state, setState] = useState<CameraState>(camera.getState())

  useEffect(() => {
    // Update local state when camera changes
    const unsubscribe = camera.subscribe(() => {
      setState(camera.getState())
    })
    return unsubscribe
  }, [camera])

  return state
}
