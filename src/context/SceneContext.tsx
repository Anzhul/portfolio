import { createContext, useContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

interface SceneObject {
  id: string
  component: ReactNode
  zIndex?: number // Optional z-index for controlling render order
}

interface SceneContextType {
  objects: SceneObject[]
  addObject: (id: string, component: ReactNode, zIndex?: number) => void
  removeObject: (id: string) => void
}

const SceneContext = createContext<SceneContextType | null>(null)

export function SceneProvider({ children }: { children: ReactNode }) {
  const [objects, setObjects] = useState<SceneObject[]>([])

  const addObject = useCallback((id: string, component: ReactNode, zIndex: number = 0, layer: 'background' | 'foreground' = 'foreground') => {
    setObjects((prev) => {
      // Prevent duplicates
      if (prev.some(obj => obj.id === id)) {
        return prev
      }
      return [...prev, { id, component, zIndex, layer }]
    })
  }, [])

  const removeObject = useCallback((id: string) => {
    setObjects((prev) => prev.filter(obj => obj.id !== id))
  }, [])

  return (
    <SceneContext.Provider value={{ objects, addObject, removeObject }}>
      {children}
    </SceneContext.Provider>
  )
}

export function useScene() {
  const context = useContext(SceneContext)
  if (!context) {
    throw new Error('useScene must be used within a SceneProvider')
  }
  return context
}
