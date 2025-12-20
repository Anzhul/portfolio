import { useEffect, useRef } from 'react'
import { useScene } from '../../context/SceneContext'

interface TestCubeProps {
  position?: [number, number, number]
  size?: number
  color?: string
  zIndex?: number
}

export function TestCube({
  position = [0, 0, 0],
  size = 100,
  color = '#ff6b6b',
  zIndex = 0
}: TestCubeProps) {
  const { addObject, removeObject } = useScene()
  const cubeId = useRef(`test-cube-${Math.random()}`).current

  useEffect(() => {
    // Create the 3D cube mesh
    const cube = (
      <mesh position={position}>
        <boxGeometry args={[size, size, size]} />
        <meshStandardMaterial
          color={color}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
    )

    // Add to the 3D scene (renders behind HTML content by default)
    addObject(cubeId, cube, zIndex)

    return () => {
      removeObject(cubeId)
    }
    // Only re-run if position, size, color, or zIndex change
    // Don't include addObject/removeObject as they're stable callbacks
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, size, color, zIndex])

  // This component doesn't render HTML - it only adds to the 3D scene
  return null
}
