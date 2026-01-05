import { useEffect, useRef } from 'react'
import { useScene } from '../../../context/SceneContext'
import { useViewport } from '../../../context/ViewportContext'

interface PlaneProps {
  position?: [number, number, number]
  mobilePosition?: [number, number, number]
  height?: number
  width?: number
  mobileHeight?: number
  mobileWidth?: number
  color?: string
  zIndex?: number
  emmissive?: number
}

export function Plane({
  position = [0, 0, 0],
  mobilePosition,
  height = 100,
  width = 100,
  mobileHeight,
  mobileWidth,
  color = '#ff6b6b',
  zIndex = 0,
  emmissive = 0.0
}: PlaneProps) {
  const { addObject, removeObject } = useScene()
  const { isMobileOnly } = useViewport()
  const planeId = useRef(`test-plane-${Math.random()}`).current

  // Use mobile values if provided and on mobile, otherwise use desktop values
  const actualPosition = isMobileOnly && mobilePosition ? mobilePosition : position
  const actualHeight = isMobileOnly && mobileHeight !== undefined ? mobileHeight : height
  const actualWidth = isMobileOnly && mobileWidth !== undefined ? mobileWidth : width

  useEffect(() => {
    // Create the 3D plane mesh
    const plane = (
      <mesh name={planeId} position={actualPosition} receiveShadow>
        <planeGeometry args={[actualWidth, actualHeight]} />
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
  }, [actualPosition, actualHeight, actualWidth, color, zIndex, emmissive])

  // This component doesn't render HTML - it only adds to the 3D scene
  return null
}
