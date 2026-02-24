import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { useCamera } from '../../context/CameraContext'
import CameraSync from './CameraSync'
import './R3FCanvas.scss'

interface R3FCanvasProps {
  children?: React.ReactNode
}

function R3FCanvas({ children }: R3FCanvasProps) {
  const camera = useCamera()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Get initial camera state for R3F
  const initialState = camera.getState()

  return (
    <div className="r3f-canvas-container">
      <Canvas
        ref={canvasRef}
        className="r3f-canvas"
        frameloop="never" // Manual control via ticker
        camera={{
          position: [0, 0, 1000],
          fov: initialState.fov,
          near: 0.1,
          far: 10000,
        }}
        gl={{
          alpha: true,
          antialias: true,
          outputColorSpace: 'srgb',
          toneMapping: 0, // NoToneMapping
        }}
        linear={false}
      >
        {/* Lights in world space */}
        <ambientLight intensity={1.5} />
        <directionalLight
          position={[1000, 100, -600]}
          intensity={4}
        />

        {/* Camera sync component updates R3F camera to match CameraContext */}
        <CameraSync />

        {/* User can add 3D content here */}
        {children}
      </Canvas>
    </div>
  )
}

export default R3FCanvas
