import { createContext, useContext, useRef, useMemo, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useViewport } from './ViewportContext'

// Tracks camera position and settings for WebGL navigation component
// Uses ref-based storage to avoid re-renders on frequent updates (dragging/panning)
// Components can subscribe to throttled updates if they need reactivity

export interface CameraState {
  worldPosition: [number, number, number]  // what the camera is centered on in world coords
  rotation: [number, number, number]
  fov: number
  zoom: number
}

export interface CameraContextType {
  // Get current state (non-reactive, doesn't cause re-renders)
  getState: () => CameraState

  // Update state (updates ref immediately, notifies subscribers with throttle)
  setWorldPosition: (worldPosition: [number, number, number]) => void
  setRotation: (rotation: [number, number, number]) => void
  setFov: (fov: number) => void
  setZoom: (zoom: number) => void

  // Batched update - set multiple values at once, notify only once
  setState: (updates: Partial<CameraState>) => void

  // Subscribe to state changes (for components that need reactivity like minimap/URL handler)
  subscribe: (listener: () => void) => () => void
}

const CameraContext = createContext<CameraContextType | undefined>(undefined)

// Throttle helper - limits function calls to once per delay
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

export function CameraProvider({ children }: { children: ReactNode }) {
  const { isMobileOnly } = useViewport()

  // Store camera state in ref (doesn't cause re-renders when updated)
  const stateRef = useRef<CameraState>({
    worldPosition: [0, 0, 5],
    rotation: [0, 0, 0],
    fov: (45 * Math.PI) / 180,  // Convert 45 degrees to radians
    zoom: isMobileOnly ? 0.3 : 0.45,  // Mobile gets more zoomed out view
  })

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

      setWorldPosition: (worldPosition) => {
        stateRef.current.worldPosition = worldPosition
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

      // Batched update - updates multiple properties and notifies only once
      setState: (updates) => {
        if (updates.worldPosition !== undefined) stateRef.current.worldPosition = updates.worldPosition
        if (updates.rotation !== undefined) stateRef.current.rotation = updates.rotation
        if (updates.fov !== undefined) stateRef.current.fov = updates.fov
        if (updates.zoom !== undefined) stateRef.current.zoom = updates.zoom
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
export function useCameraState() {
  const camera = useCamera()
  const [state, setState] = useState<CameraState>(camera.getState())

  useEffect(() => {
    const unsubscribe = camera.subscribe(() => {
      setState(camera.getState())
    })
    return unsubscribe
  }, [camera])

  return state
}
