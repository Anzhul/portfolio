import { useEffect, useRef } from 'react'
import { useScene } from '../../../context/SceneContext'

interface PlaneProps {
  position?: [number, number, number]
  height?: number
  width?: number
  color?: string
  zIndex?: number
  emmissive?: number
}

export function Plane({
  position = [0, 0, 0],
  height = 100,
  width = 100,
  color = '#ff6b6b',
  zIndex = 0,
  emmissive = 0.0
}: PlaneProps) {
  const { addObject, removeObject } = useScene()
  const planeId = useRef(`test-plane-${Math.random()}`).current

  useEffect(() => {
    // Create the 3D plane mesh
    const plane = (
      <mesh name={planeId} position={position} receiveShadow>
        <planeGeometry args={[width, height]} />
        {emmissive !== 0.0 ? (
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={emmissive}
            roughness={0.3}
            metalness={0.7}
            side={2}  // DoubleSide - visible from both sides
          />
        ) : (
          <meshStandardMaterial
            color={color}
            roughness={0.3}
            metalness={0.7}
            side={2}  // DoubleSide - visible from both sides
          />
        )}
      </mesh>
    )

    // Add to the 3D scene (renders behind HTML content by default)
    addObject(planeId, plane, zIndex)

    return () => {
      removeObject(planeId)
    }
    // Only re-run if position, height, width, color, zIndex, or emmissive change
    // Don't include addObject/removeObject as they're stable callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, height, width, color, zIndex, emmissive])

  // This component doesn't render HTML - it only adds to the 3D scene
  return null
}
