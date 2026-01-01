import { createContext, useContext, useSyncExternalStore, useRef, useCallback } from 'react'
import type { ReactNode } from 'react'

interface SceneObject {
  id: string
  component: ReactNode
  zIndex?: number // Optional z-index for controlling render order
}

interface SceneContextType {
  getObjects: () => SceneObject[]
  addObject: (id: string, component: ReactNode, zIndex?: number) => void
  removeObject: (id: string) => void
  subscribe: (callback: () => void) => () => void
}

const SceneContext = createContext<SceneContextType | null>(null)

/**
 * SceneProvider using external store pattern
 * This prevents unnecessary rerenders when objects are added/removed
 * Components using useScene() will only rerender when they need the objects array
 */
export function SceneProvider({ children }: { children: ReactNode }) {
  // Use ref to store objects - this doesn't trigger rerenders
  const objectsRef = useRef<SceneObject[]>([])
  const listenersRef = useRef<Set<() => void>>(new Set())

  // Notify all subscribers when objects change
  const notifyListeners = useCallback(() => {
    listenersRef.current.forEach(listener => listener())
  }, [])

  const addObject = useCallback((id: string, component: ReactNode, zIndex: number = 0) => {
    // Prevent duplicates
    if (objectsRef.current.some(obj => obj.id === id)) {
      return
    }

    objectsRef.current = [...objectsRef.current, { id, component, zIndex }]
    notifyListeners()
  }, [notifyListeners])

  const removeObject = useCallback((id: string) => {
    const newObjects = objectsRef.current.filter(obj => obj.id !== id)
    if (newObjects.length !== objectsRef.current.length) {
      objectsRef.current = newObjects
      notifyListeners()
    }
  }, [notifyListeners])

  const subscribe = useCallback((callback: () => void) => {
    listenersRef.current.add(callback)
    return () => {
      listenersRef.current.delete(callback)
    }
  }, [])

  const getObjects = useCallback(() => objectsRef.current, [])

  const value = useRef({
    getObjects,
    addObject,
    removeObject,
    subscribe
  }).current

  return (
    <SceneContext.Provider value={value}>
      {children}
    </SceneContext.Provider>
  )
}

/**
 * Hook to access scene objects
 * Uses useSyncExternalStore to only rerender when objects array actually changes
 */
export function useScene() {
  const context = useContext(SceneContext)
  if (!context) {
    throw new Error('useScene must be used within a SceneProvider')
  }
  return context
}

/**
 * Hook to get scene objects with automatic rerendering
 * Only components that need the objects array should use this
 */
export function useSceneObjects() {
  const context = useContext(SceneContext)
  if (!context) {
    throw new Error('useSceneObjects must be used within a SceneProvider')
  }

  return useSyncExternalStore(
    context.subscribe,
    context.getObjects,
    context.getObjects
  )
}
