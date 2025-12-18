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
        frameloop="never" // Manual control via ticker (same as VaseR3F)
        camera={{
          position: [
            initialState.position[0],
            initialState.position[1],
            initialState.position[2]
          ],
          fov: initialState.fov,
          near: 0.1,
          far: 10000,
        }}
        gl={{
          alpha: true,
          antialias: true,
        }}
      >
        {/* Camera sync component updates R3F camera to match CameraContext */}
        <CameraSync />

        {/* Ambient light for basic visibility */}
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />

        {/* User can add 3D content here */}
        {children}
      </Canvas>
    </div>
  )
}

export default R3FCanvas
