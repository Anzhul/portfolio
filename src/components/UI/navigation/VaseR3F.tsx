import { useEffect, useRef } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import './Navigation.scss'

// Component to set camera to look straight ahead
function CameraController() {
  const { camera } = useThree()

  useEffect(() => {
    // Point camera straight ahead (negative X direction from its position)
    camera.lookAt(0, 0, 0) // Look straight in the -X direction
    camera.updateProjectionMatrix()
  }, [camera])

  return null
}

function VaseMesh() {
  // Load GLTF model - get the entire scene
  const { scene } = useGLTF('/Vase.glb')

  return (
    <primitive
      object={scene}
      position={[0, -2.5, 0]} // Vase at origin
      rotation={[0, 0, 0]} // No rotation
      scale={1.6}
    />
  )
}

function VaseR3F() {
  return (
    <Canvas
      className="vase-canvas"
      style={{ background: 'rgba(255, 0, 0, 0.1)' }} // Temporary red tint to see canvas
      orthographic // Use orthographic camera (no perspective warping)
      camera={{
        position: [0, 0, 0],
        zoom: 20, // Control size with zoom instead of distance
      }}
    >
      {/* Camera controller to look straight ahead */}
      <CameraController />

      {/* Add some lights */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />

      {/* Test cube to verify rendering */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="orange" />
      </mesh>

      {/* Vase mesh */}
      <VaseMesh />
    </Canvas>
  )
}

// Preload the GLTF model
useGLTF.preload('/Vase.glb')

export default VaseR3F
