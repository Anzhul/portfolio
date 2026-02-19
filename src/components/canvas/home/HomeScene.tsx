import { Canvas, useThree, createPortal } from '@react-three/fiber'
import { useEffect, useRef, Suspense, useMemo, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import { useViewport } from '../../../context/ViewportContext'
import * as THREE from 'three'
import type { MaterialOverride } from './materialUtils'
import { GameContent } from '../game/GameContent'
import { TVModel, PlateModel, VaseModel } from '../game/TVModel'

/**
 * Error boundary to catch runtime errors inside the R3F tree
 */
class R3FErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[HomeScene] R3F Error Boundary caught error:', error)
    console.error('[HomeScene] Component stack:', errorInfo.componentStack)
  }

  render() {
    if (this.state.hasError) {
      console.error('[HomeScene] Rendering null due to error:', this.state.error?.message)
      return null
    }
    return this.props.children
  }
}

export interface HomeSceneProps {
  isVisible?: boolean
  scrollContainer?: React.RefObject<HTMLDivElement>
  tvScale?: number
  tvPosition?: [number, number, number]
  tvRotation?: [number, number, number]
  tvMaterialOverrides?: MaterialOverride[]
  plateScale?: number
  platePosition?: [number, number, number]
  vaseScale?: number
  vasePosition?: [number, number, number]
  onReady?: () => void
}

/**
 * CameraController - Adjusts camera position based on viewport width
 * Zooms out on smaller screens to keep models in view
 */
function CameraController() {
  const { camera } = useThree()
  const { width, isMobileOnly, isTabletDown } = useViewport()

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      let zPosition = 90
      let xPosition = 0
      let yPosition = 0

      if (isMobileOnly) {
        xPosition = 0
        yPosition = 0
        zPosition = 12
      } else if (isTabletDown) {
        xPosition = 0
        zPosition = 10
      } else if (width < 1440) {
        zPosition = 100
        xPosition = 0
        yPosition = 0
      }

      camera.position.x = xPosition
      camera.position.y = yPosition
      camera.position.z = zPosition
      camera.updateProjectionMatrix()
    }
  }, [camera, width, isMobileOnly, isTabletDown])

  return null
}

/**
 * ReadyNotifier - Signals that models inside Suspense have mounted
 */
function ReadyNotifier({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])
  return null
}

const FBO_WIDTH = 768
const FBO_HEIGHT = 960

const TV_MATERIAL_OVERRIDES: MaterialOverride[] = [
  { materialName: 'Default', color: '#2a2a2a', roughness: 0.6, metalness: 0.1 },
  { materialName: 'Red', color: '#901d06', roughness: 0.4, metalness: 0.1 },
  { materialName: 'White', color: '#e8e8e8', roughness: 0.5, metalness: 0.0 },
  { materialName: 'Yellow', color: '#FDBC65', roughness: 0.3, metalness: 0.2 },
  { materialName: 'gold', color: '#D4A843', metalness: 0.7, roughness: 0.2 },
]

/**
 * Scene - Wrapper component with TV + game FBO rendering
 */
function Scene({
  isVisible = true,
  tvScale = 0.06,
  tvPosition = [0, -1.8, 0],
  tvMaterialOverrides = TV_MATERIAL_OVERRIDES,
  plateScale = 0.7,
  platePosition = [-1.2, -1.8, 0.2],
  vaseScale = 0.7,
  vasePosition = [-1.2, -1.8, -0.2],
  onReady
}: HomeSceneProps) {
  const { gl, scene, camera } = useThree()

  // Shared game input state: TV pointer events → PhysicsPlayer movement
  const gameInputRef = useRef({ active: false, startX: 0, currentX: 0, startY: 0, currentY: 0, maxDx: 0, startTime: 0 })

  // Whether dialogue is active — used by TVModel to advance/close dialogue on tap
  const npcInRangeRef = useRef(false)

  // Auto-walk target X: set by TVModel when user taps NPC on TV, cleared by NostalgiaDialogue on arrival
  const autoWalkRef = useRef<number | null>(null)

  // Disable tone mapping for pixel art
  gl.toneMapping = THREE.NoToneMapping
  gl.autoClear = false

  const gameScene = useMemo(() => {
    const s = new THREE.Scene()
    s.background = new THREE.Color(0x000000)
    return s
  }, [])

  const gameCamera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(
      FBO_WIDTH / -2, FBO_WIDTH / 2,
      FBO_HEIGHT / 2, FBO_HEIGHT / -2,
      0.1, 1000
    )
    cam.zoom = 20
    cam.position.set(-46, 5, 25)
    cam.updateProjectionMatrix()
    return cam
  }, [])

  const gameViewportWidth = FBO_HEIGHT / 8

  const fbo = useMemo(() => {
    return new THREE.WebGLRenderTarget(FBO_WIDTH, FBO_HEIGHT, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    })
  }, [])

  useEffect(() => () => fbo.dispose(), [fbo])

  // Two-pass rendering
  useEffect(() => {
    if (!isVisible) return

    const render = () => {
      // Pass 1: Render game scene to FBO
      gl.setRenderTarget(fbo)
      gl.setClearColor(0x000000, 1)
      gl.clear()
      gl.render(gameScene, gameCamera)

      // Pass 2: Render TV scene to screen
      gl.setRenderTarget(null)
      gl.setClearColor(0x000000, 0)
      gl.clear()
      gl.render(scene, camera)
    }
    ticker.add(render)
    return () => ticker.remove(render)
  }, [gl, scene, camera, gameScene, gameCamera, fbo, isVisible])

  return (
    <>
      {/* Camera controller for responsive zoom */}
      <CameraController />

      {/* Lighting setup */}
      <ambientLight intensity={1.8} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />

      {/* Game world rendered to FBO via portal — own Suspense so it doesn't block ReadyNotifier */}
      <R3FErrorBoundary>
        {createPortal(
          <Suspense fallback={null}>
            <GameContent
              gameCamera={gameCamera}
              gameViewportWidth={gameViewportWidth}
              gameInputRef={gameInputRef}
              npcInRangeRef={npcInRangeRef}
              autoWalkRef={autoWalkRef}
            />
          </Suspense>,
          gameScene
        )}
      </R3FErrorBoundary>

      {/* TV model with game texture — ReadyNotifier inside so page waits for TV to load */}
      <R3FErrorBoundary>
        <Suspense fallback={null}>
          <TVModel
            screenTexture={fbo.texture}
            position={tvPosition}
            scale={tvScale}
            materialOverrides={tvMaterialOverrides}
            gameInputRef={gameInputRef}
            npcInRangeRef={npcInRangeRef}
            gameCamera={gameCamera}
            autoWalkRef={autoWalkRef}
          />
          <PlateModel
            position={platePosition}
            scale={plateScale}
          />
          <VaseModel
            position={vasePosition}
            scale={vaseScale}
          />
          <ReadyNotifier onReady={onReady} />
        </Suspense>
      </R3FErrorBoundary>
    </>
  )
}

/**
 * HomeScene - 3D scene for Home page with TV game display
 */
function HomeScene({
  isVisible = true,
  scrollContainer,
  tvScale = 0.025,
  tvPosition = [0, -2.0, 0],
  tvRotation = [0, 0, 0],
  tvMaterialOverrides = TV_MATERIAL_OVERRIDES,
  plateScale = 0.7,
  platePosition = [-1.2, -2.0, 0.2],
  vaseScale = 0.7,
  vasePosition = [-1.2, -2.0, -0.2],
  onReady
}: HomeSceneProps) {
  return (
    <Canvas
      className="home-scene-canvas"
      eventSource={scrollContainer}
      eventPrefix="client"
      frameloop="never"
      camera={{ position: [0, 0, 8], fov: 5 }}
      gl={{
        alpha: true,
        antialias: true,
        outputColorSpace: 'srgb',
      }}
    >
      <Scene
        isVisible={isVisible}
        scrollContainer={scrollContainer}
        tvScale={tvScale}
        tvPosition={tvPosition}
        tvRotation={tvRotation}
        tvMaterialOverrides={tvMaterialOverrides}
        plateScale={plateScale}
        platePosition={platePosition}
        vaseScale={vaseScale}
        vasePosition={vasePosition}
        onReady={onReady}
      />
    </Canvas>
  )
}

export default HomeScene
export type { MaterialOverride }
