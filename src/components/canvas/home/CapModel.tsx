import { Canvas, useLoader } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export interface CapModelProps {
  color?: string
  rotationSpeed?: number
  scale?: number
}

/**
 * CapMesh component - Loads and animates the cap.obj model
 */
function CapMesh({ color = '#FF711E', rotationSpeed = 0.008, scale = 1 }: CapModelProps) {
  const groupRef = useRef<THREE.Group>(null!)

  // Load GLB file
  const gltf = useLoader(GLTFLoader, '/cap.glb')

  // Apply material to the loaded model
  useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.material = new THREE.MeshStandardMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.15,
            roughness: 0.4,
            metalness: 0.6,
          })
        }
      })
    }
  }, [gltf, color])

  // Animation
  useEffect(() => {
    let rotation = 0

    const animate = () => {
      rotation += rotationSpeed

      if (groupRef.current) {
        groupRef.current.rotation.y = rotation
        groupRef.current.rotation.z = Math.sin(rotation * 0.3) * 0.15
        groupRef.current.position.y = Math.cos(rotation * 1.5) * 0.25
      }
    }

    ticker.add(animate)
    return () => ticker.remove(animate)
  }, [rotationSpeed])

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={gltf.scene} />
    </group>
  )
}

/**
 * CapModel - A lazy-loadable 3D cap model component
 *
 * Loads and displays the cap.obj file with smooth animations.
 * Uses the custom AnimationTicker for efficient rendering.
 *
 * @example
 * const LazyCapModel = lazy(() => import('./CapModel'))
 *
 * <Lazy3DObject
 *   loadStrategy="delayed"
 *   delay={2000}
 *   component={LazyCapModel}
 *   componentProps={{ color: '#FF711E', scale: 1.5 }}
 * />
 */
function CapModel({ color, rotationSpeed, scale }: CapModelProps) {
  return (
    <Canvas
      className="cap-model-canvas"
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
      <pointLight position={[0, 0, 5]} intensity={0.3} color="#5588ff" />

      <CapMesh color={color} rotationSpeed={rotationSpeed} scale={scale} />
    </Canvas>
  )
}

export default CapModel
