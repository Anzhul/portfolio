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
          position: [
            initialState.truePosition[0],
            initialState.truePosition[1],
            initialState.truePosition[2]
          ],
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
        shadows
      >
        {/* Lights in world space (don't move with scene) - fixed shadow camera */}
        <ambientLight intensity={3} />
        <directionalLight
          position={[1000, 100, -600]}
          intensity={10}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-far={5000}
          shadow-camera-left={-2000}
          shadow-camera-right={2000}
          shadow-camera-top={2000}
          shadow-camera-bottom={-2000}
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
