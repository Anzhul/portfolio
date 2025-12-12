import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

// Tracks camera position and settings for WebGL navigation component

interface CameraContextType {
  cameraPosition: [number, number, number]
  setCameraPosition: (position: [number, number, number]) => void
  cameraRotation: [number, number, number]
  setCameraRotation: (rotation: [number, number, number]) => void
  fov: number
  setFov: (fov: number) => void
  zoom: number
  setZoom: (zoom: number) => void
}

const CameraContext = createContext<CameraContextType | undefined>(undefined)

export function CameraProvider({ children }: { children: ReactNode }) {
  // Camera position in 3D space (x, y, z)
  const [cameraPosition, setCameraPosition] = useState<[number, number, number]>([0, 0, 5])

  // Camera rotation in radians (x, y, z)
  const [cameraRotation, setCameraRotation] = useState<[number, number, number]>([0, 0, 0])

  // Field of view (in degrees)
  const [fov, setFov] = useState(75)

  // Zoom level
  const [zoom, setZoom] = useState(1)

  return (
    <CameraContext.Provider
      value={{
        cameraPosition,
        setCameraPosition,
        cameraRotation,
        setCameraRotation,
        fov,
        setFov,
        zoom,
        setZoom,
      }}
    >
      {children}
    </CameraContext.Provider>
  )
}

export function useCamera() {
  const context = useContext(CameraContext)
  if (context === undefined) {
    throw new Error('useCamera must be used within a CameraProvider')
  }
  return context
}
