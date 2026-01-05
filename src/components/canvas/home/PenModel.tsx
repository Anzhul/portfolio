import { Canvas, useLoader } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

export interface PenModelProps {
  color?: string
  rotationSpeed?: number
  scale?: number
}

/**
 * PenMesh component - Loads and animates the pen.obj model
 */
function PenMesh({ color = '#B05248', rotationSpeed = 0.005, scale = 1 }: PenModelProps) {
  const groupRef = useRef<THREE.Group>(null!)

  // Load OBJ file
  const obj = useLoader(OBJLoader, '/pen.obj')
  

  // Apply material to the loaded model
  useEffect(() => {
    if (obj) {
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.1,
            roughness: 0.3,
            metalness: 0.7,
          })
        }
      })
    }
  }, [obj, color])

  // Animation
  useEffect(() => {
    let rotation = 0

    const animate = () => {
      rotation += rotationSpeed

      if (groupRef.current) {
        groupRef.current.rotation.y = rotation
        groupRef.current.rotation.x = Math.sin(rotation * 0.5) * 0.1
        groupRef.current.position.y = Math.sin(rotation * 2) * 0.2
      }
    }

    ticker.add(animate)
    return () => ticker.remove(animate)
  }, [rotationSpeed])

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={obj} />
    </group>
  )
}

/**
 * PenModel - A lazy-loadable 3D pen model component
 *
 * Loads and displays the pen.obj file with smooth animations.
 * Uses the custom AnimationTicker for efficient rendering.
 *
 * @example
 * const LazyPenModel = lazy(() => import('./PenModel'))
 *
 * <Lazy3DObject
 *   loadStrategy="intersection"
 *   component={LazyPenModel}
 *   componentProps={{ color: '#B05248', scale: 2 }}
 * />
 */
function PenModel({ color, rotationSpeed, scale }: PenModelProps) {
  return (
    <Canvas
      className="pen-model-canvas"
      frameloop="never" // Manual control via ticker
      camera={{ position: [0, 0, 5], fov: 45 }}
      gl={{
        alpha: true,
        antialias: true,
        outputColorSpace: 'srgb',
      }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, -3, -3]} intensity={0.5} />
      <pointLight position={[0, 0, 5]} intensity={0.3} color="#ff7700" />

      <PenMesh color={color} rotationSpeed={rotationSpeed} scale={scale} />
    </Canvas>
  )
}

export default PenModel
