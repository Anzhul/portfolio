import { Canvas } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import * as THREE from 'three'

export interface FloatingObjectProps {
  color?: string
  size?: number
  animationSpeed?: number
}

/**
 * Mesh component - handles the 3D object rendering and animation
 */
function Mesh({ color = '#B05248', size = 1, animationSpeed = 0.01 }: FloatingObjectProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)

  useEffect(() => {
    let rotation = 0

    const animate = () => {
      rotation += animationSpeed

      if (groupRef.current) {
        // Rotate the entire group
        groupRef.current.rotation.y = rotation
        groupRef.current.rotation.x = Math.sin(rotation * 0.5) * 0.3
      }

      if (meshRef.current) {
        // Float up and down
        meshRef.current.position.y = Math.sin(rotation * 2) * 0.3
      }
    }

    ticker.add(animate)
    return () => ticker.remove(animate)
  }, [animationSpeed])

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        {/* Torus knot geometry for interesting shape */}
        <torusKnotGeometry args={[size, size * 0.3, 128, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
    </group>
  )
}

/**
 * FloatingObject - A lazy-loadable 3D object component
 *
 * This component creates an animated floating 3D torus knot.
 * Uses the custom AnimationTicker for efficient manual rendering.
 *
 * @example
 * const LazyFloatingObject = lazy(() => import('./FloatingObject'))
 *
 * <Lazy3DObject
 *   component={LazyFloatingObject}
 *   componentProps={{ color: '#B05248', size: 1.5 }}
 * />
 */
function FloatingObject({ color, size, animationSpeed }: FloatingObjectProps) {
  return (
    <Canvas
      className="floating-object-canvas"
      frameloop="never" // Manual control via ticker
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{
        alpha: true,
        antialias: true,
        outputColorSpace: 'srgb',
      }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ff7700" />

      <Mesh color={color} size={size} animationSpeed={animationSpeed} />
    </Canvas>
  )
}

export default FloatingObject
