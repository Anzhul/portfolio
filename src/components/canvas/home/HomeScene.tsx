import { Canvas, useThree, createPortal } from '@react-three/fiber'
import { useEffect, useRef, Suspense, useMemo, Component } from 'react'
import type { ReactNode } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import { useViewport } from '../../../context/ViewportContext'
import { useScroll } from '../../../context/ScrollContext'
import * as THREE from 'three'
import type { MaterialOverride } from './materialUtils'
import { GameContent } from '../game/GameContent'
import { TVModel, VaseModel } from '../game/TVModel'
import { SceneVisibilityContext } from '../SceneVisibilityContext'
import { GalleryEnvironment } from './GalleryEnvironment'

/**
 * Error boundary to catch runtime errors inside the R3F tree
 */
class R3FErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
  state = { hasError: false, error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    console.error('[ErrorBoundary] caught:', error.message, error.stack)
    return { hasError: true, error }
  }

  componentDidCatch() {
    // logged in getDerivedStateFromError
  }

  render() {
    if (this.state.hasError) {
      console.warn('[ErrorBoundary] rendering null due to:', this.state.error?.message)
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
  vaseScale?: number
  vasePosition?: [number, number, number]
  onReady?: () => void
}

/**
 * ScrollAttacher - Connects page-level scroll to ScrollContext.
 * Scroll events don't bubble, so we listen on window and proxy
 * a synthetic event to document.documentElement for ScrollContext.
 */
function ScrollAttacher() {
  const scroll = useScroll()

  useEffect(() => {
    const el = document.documentElement
    scroll.attach(el)
    scroll.setSmoothingFactor(0.08)

    // Window scroll events don't fire on documentElement directly —
    // proxy them so ScrollContext's listener picks them up
    const proxyScroll = () => {
      el.dispatchEvent(new Event('scroll'))
    }
    window.addEventListener('scroll', proxyScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', proxyScroll)
      scroll.detach()
    }
  }, [scroll])

  return null
}

/**
 * Camera keyframe system — 4-stop scroll-driven tour through the gallery.
 * Each breakpoint has its own keyframe set since objects are positioned differently.
 */
interface CameraKeyframe {
  progress: number
  position: [number, number, number]
  lookAt: [number, number, number]
}

// Image placeholder position on back wall (exported for GalleryEnvironment)
export const WALL_IMAGE_POSITION: [number, number, number] = [10.0, 3.75, -19.9]

const KEYFRAMES_WIDE: CameraKeyframe[] = [
  { progress: 0,    position: [250, 350, 600],       lookAt: [0, 5, -20] },
  { progress: 0.25, position: [-5,  8, 80],          lookAt: [-5, 2.5, -17] },
  { progress: 0.5,  position: [10, 5, 100],          lookAt: [5, 0, -14] },
  { progress: 0.7,  position: [7.5, 1.75, 10],       lookAt: WALL_IMAGE_POSITION },
  { progress: 0.85, position: [10, 3.75, -5],        lookAt: WALL_IMAGE_POSITION },
  { progress: 1.0,  position: [250, 350, 600],       lookAt: [0, 5, -20] },
]

const KEYFRAMES_DESKTOP: CameraKeyframe[] = [
  { progress: 0,    position: [0, 8, 0],             lookAt: [0, -5, 0] },
  { progress: 0.25, position: [-5.5, -1, 27],        lookAt: [-5.5, -2.5, -17] },
  { progress: 0.5,  position: [4.5, -1, 32],         lookAt: [4.5, -2.5, -14] },
  { progress: 0.7,  position: [7.5, 1.75, 22],       lookAt: WALL_IMAGE_POSITION },
  { progress: 0.85, position: [10, 3.75, -5],        lookAt: WALL_IMAGE_POSITION },
  { progress: 1.0,  position: [0, 15, 80],           lookAt: [0, -2, -20] },
]

const KEYFRAMES_TABLET: CameraKeyframe[] = [
  { progress: 0,    position: [0, 8, 200],           lookAt: [0, -5, 0] },
  { progress: 0.25, position: [0, -1, 25],           lookAt: [0, -2.5, -17] },
  { progress: 0.5,  position: [3, -1, 30],           lookAt: [3, -2.5, -14] },
  { progress: 0.7,  position: [7.5, 1.75, 20],       lookAt: WALL_IMAGE_POSITION },
  { progress: 0.85, position: [10, 3.75, -5],        lookAt: WALL_IMAGE_POSITION },
  { progress: 1.0,  position: [0, 15, 70],           lookAt: [0, -2, -20] },
]

const KEYFRAMES_MOBILE: CameraKeyframe[] = [
  { progress: 0,    position: [0, 3, 30],            lookAt: [0, -1.5, 0] },
  { progress: 0.25, position: [0, -0.1, 6],          lookAt: [0, -0.3, 0] },
  { progress: 0.5,  position: [0, -0.1, 6],          lookAt: [0, -0.3, 0] },
  { progress: 0.7,  position: [7.5, 1.75, 4],        lookAt: WALL_IMAGE_POSITION },
  { progress: 0.85, position: [10, 3.75, -5],        lookAt: WALL_IMAGE_POSITION },
  { progress: 1.0,  position: [0, 10, 40],           lookAt: [0, -2, -20] },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// Smoothstep easing — smooth acceleration/deceleration
function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

// Reusable vector for lookAt target (avoids allocation per frame)
const _lookAtTarget = new THREE.Vector3()

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
  vaseScale = 0.45,
  vasePosition = [-1.2, -0.4, 1.5],
  onReady
}: HomeSceneProps) {
  const { gl, scene, camera } = useThree()
  const scroll = useScroll()
  const { breakpoint } = useViewport()

  // Select keyframes based on breakpoint
  const keyframes = useMemo(() => {
    switch (breakpoint) {
      case 'mobile': return KEYFRAMES_MOBILE
      case 'tablet': return KEYFRAMES_TABLET
      case 'desktop': return KEYFRAMES_DESKTOP
      case 'wide':
      default: return KEYFRAMES_WIDE
    }
  }, [breakpoint])

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

  // Monitor WebGL context loss
  useEffect(() => {
    const canvas = gl.domElement
    const onLost = (e: Event) => console.error('[WebGL] Context LOST', e)
    const onRestored = () => console.log('[WebGL] Context restored')
    canvas.addEventListener('webglcontextlost', onLost)
    canvas.addEventListener('webglcontextrestored', onRestored)
    return () => {
      canvas.removeEventListener('webglcontextlost', onLost)
      canvas.removeEventListener('webglcontextrestored', onRestored)
    }
  }, [gl])

  // Two-pass rendering with keyframe-driven camera
  useEffect(() => {
    console.log('[Scene] render effect — isVisible:', isVisible)
    if (!isVisible) return

    let frameCount = 0
    const render = () => {
      if (frameCount++ < 5) console.log('[Scene] render frame', frameCount)
      // Interpolate camera position/lookAt from scroll keyframes
      if (camera instanceof THREE.PerspectiveCamera) {
        const { progress, smoothProgress } = scroll.getState()

        // Remap progress: camera animation uses first 75% of scroll,
        // remaining 25% slides the canvas up and out of view.
        const CAMERA_END = 0.75
        const cameraProgress = Math.min(1, smoothProgress / CAMERA_END)

        // Slide the fixed canvas container up once keyframes are done.
        // Uses raw `progress` (not smoothProgress) so the canvas moves
        // at exactly the same rate as the native page scroll.
        const container = gl.domElement.closest('.home-canvas-fixed') as HTMLElement | null
        if (container) {
          if (progress > CAMERA_END) {
            const scrollOutT = (progress - CAMERA_END) / (1 - CAMERA_END)
            container.style.transform = `translateY(${-scrollOutT * 100}vh)`
          } else {
            container.style.transform = ''
          }
        }

        // Find bounding keyframes
        let fromIdx = 0
        for (let i = keyframes.length - 1; i >= 0; i--) {
          if (cameraProgress >= keyframes[i].progress) { fromIdx = i; break }
        }
        const toIdx = Math.min(fromIdx + 1, keyframes.length - 1)
        const from = keyframes[fromIdx]
        const to = keyframes[toIdx]
        const range = to.progress - from.progress
        const t = range > 0 ? (cameraProgress - from.progress) / range : 1
        const eased = smoothstep(t)

        camera.position.set(
          lerp(from.position[0], to.position[0], eased),
          lerp(from.position[1], to.position[1], eased),
          lerp(from.position[2], to.position[2], eased),
        )
        _lookAtTarget.set(
          lerp(from.lookAt[0], to.lookAt[0], eased),
          lerp(from.lookAt[1], to.lookAt[1], eased),
          lerp(from.lookAt[2], to.lookAt[2], eased),
        )
        camera.lookAt(_lookAtTarget)
      }

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
  }, [gl, scene, camera, gameScene, gameCamera, fbo, isVisible, scroll, keyframes])

  return (
    <SceneVisibilityContext.Provider value={isVisible}>
      {/* Gallery environment — floor, wall, pedestals, lighting */}
      <GalleryEnvironment
        tvPosition={tvPosition as [number, number, number]}
        vasePosition={vasePosition as [number, number, number]}
      />

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
          <VaseModel
            position={vasePosition}
            scale={vaseScale}
          />
          <ReadyNotifier onReady={onReady} />
        </Suspense>
      </R3FErrorBoundary>
    </SceneVisibilityContext.Provider>
  )
}

/**
 * Fixes pointer-to-NDC mapping when canvas is offset from the viewport origin.
 * The default R3F compute with eventPrefix="client" divides clientX/Y by canvas
 * size without subtracting the canvas position, causing misaligned hit areas.
 * Also skips raycasting when the event target is inside .home-content (scrolled over canvas).
 */
function JsonPointerCompute() {
  const state = useThree()

  useEffect(() => {
    state.events.compute = (event: any, root: any) => {
      const rect = root.gl.domElement.getBoundingClientRect()
      root.pointer.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      )
      root.raycaster.setFromCamera(root.pointer, root.camera)
    }
  }, [state])

  return null
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
  vaseScale = 0.45,
  vasePosition = [-1.2, -2.0, -0.2],
  onReady
}: HomeSceneProps) {
  return (
    <Canvas
      className="home-scene-canvas"
      eventSource={scrollContainer}
      eventPrefix="client"
      frameloop="never"
      camera={{ position: [0, 0, 8], fov: 5, near: 5, far: 1000 }}
      gl={{
        alpha: true,
        antialias: true,
        outputColorSpace: 'srgb',
      }}
    >
      <ScrollAttacher />
      <JsonPointerCompute />
      <Scene
        isVisible={isVisible}
        scrollContainer={scrollContainer}
        tvScale={tvScale}
        tvPosition={tvPosition}
        tvRotation={tvRotation}
        tvMaterialOverrides={tvMaterialOverrides}
        vaseScale={vaseScale}
        vasePosition={vasePosition}
        onReady={onReady}
      />
    </Canvas>
  )
}

export default HomeScene
export type { MaterialOverride }
