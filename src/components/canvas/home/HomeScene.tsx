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

    // Calculate scroll region so progress 0→1 maps to the canvas section only.
    // Animation starts when the canvas section top reaches the viewport top.
    const updateScrollRegion = () => {
      const section = document.querySelector('.about-canvas-section') as HTMLElement | null
      if (section) {
        const rect = section.getBoundingClientRect()
        const sectionTop = rect.top + window.scrollY
        const sectionHeight = section.offsetHeight
        const viewportHeight = window.innerHeight
        scroll.setScrollRegion(sectionTop, sectionTop + sectionHeight - viewportHeight)
      }
    }

    updateScrollRegion()
    window.addEventListener('resize', updateScrollRegion)

    // Window scroll events don't fire on documentElement directly —
    // proxy them so ScrollContext's listener picks them up
    const proxyScroll = () => {
      el.dispatchEvent(new Event('scroll'))
    }
    window.addEventListener('scroll', proxyScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', proxyScroll)
      window.removeEventListener('resize', updateScrollRegion)
      scroll.clearScrollRegion()
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
  fov?: number
}

// Image placeholder position on back wall (exported for GalleryEnvironment)
export const WALL_IMAGE_POSITION: [number, number, number] = [1, 0.25, -19.55]

const KEYFRAMES_WIDE: CameraKeyframe[] = [
  { progress: 0,    position: [250, 350, 600],       lookAt: [0, 5, -20], fov: 5 },
  { progress: 0.15, position: [-5,  8, 80],          lookAt: [-5, 2, -17], fov: 5 },
  { progress: 0.3,  position: [-5, 5, 20],           lookAt: [8.5, 0, -14], fov: 20 },
  { progress: 0.55, position: [3.5, 3.5, -8],        lookAt: [3.5, 3.5, -20], fov: 25 },
  { progress: 0.75, position: [15, 3.5, -8],        lookAt: [15, 3.5, -20], fov: 25 },
  { progress: 1.0,  position: [50, 70, 120],         lookAt: [0, 5, -20], fov: 25 },
]

const KEYFRAMES_DESKTOP: CameraKeyframe[] = [
  { progress: 0,    position: [250, 350, 600],       lookAt: [0, 5, -20], fov: 5 },
  { progress: 0.15, position: [-5,  8, 80],          lookAt: [-5, 2, -17], fov: 5 },
  { progress: 0.3,  position: [-5, 5, 20],           lookAt: [8.5, 0, -14], fov: 20 },
  { progress: 0.55, position: [3.5, 3.0, -8],        lookAt: [3.5, 3.0, -20], fov: 25 },
  { progress: 0.75, position: [15, 3.0, -8],        lookAt: [15, 3.0, -20], fov: 25 },
  { progress: 1.0,  position: [50, 70, 120],         lookAt: [0, 5, -20], fov: 25 },
]

const KEYFRAMES_TABLET: CameraKeyframe[] = [
  { progress: 0,    position: [250, 350, 600],       lookAt: [0, 5, -20], fov: 5 },
  { progress: 0.15, position: [-5,  8, 80],          lookAt: [-5, 2, -17], fov: 5 },
  { progress: 0.3,  position: [-5, 5, 20],           lookAt: [8.5, 0, -14], fov: 20 },
  { progress: 0.55, position: [3.5, 3.0, -8],        lookAt: [3.5, 3.0, -20], fov: 25 },
  { progress: 0.75, position: [15, 3.0, -8],        lookAt: [15, 3.0, -20], fov: 25 },
  { progress: 1.0,  position: [50, 70, 120],         lookAt: [0, 5, -20], fov: 25 },
]

const KEYFRAMES_MOBILE: CameraKeyframe[] = [
  { progress: 0,    position: [250, 350, 600],       lookAt: [0, 5, -20], fov: 5 },
  { progress: 0.15, position: [-5,  8, 80],          lookAt: [-5, 2, -17], fov: 5 },
  { progress: 0.3,  position: [-5, 5, 20],           lookAt: [8.5, 0, -14], fov: 20 },
  { progress: 0.55, position: [3.5, 3.0, -8],        lookAt: [3.5, 3.0, -20], fov: 25 },
  { progress: 0.75, position: [15, 3.0, -8],        lookAt: [15, 3.0, -20], fov: 25 },
  { progress: 1.0,  position: [50, 70, 120],         lookAt: [0, 5, -20], fov: 25 },
]

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

// Smoothstep easing — smooth acceleration/deceleration
function smoothstep(t: number) {
  return t * t * (3 - 2 * t)
}

// Reusable vectors (avoid allocation per frame)
const _lookAtTarget = new THREE.Vector3()
const _drawSize = new THREE.Vector2()

/**
 * ReadyNotifier - Signals that models inside Suspense have mounted
 */
function ReadyNotifier({ onReady }: { onReady?: () => void }) {
  useEffect(() => {
    onReady?.()
  }, [onReady])
  return null
}

// Game world dimensions (constant, independent of render resolution)
const GAME_WIDTH = 768
const GAME_HEIGHT = 960

const TV_MATERIAL_OVERRIDES: MaterialOverride[] = [
  { materialName: 'Default', color: '#3a3535', roughness: 0.6, metalness: 0.1 },
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

  // TV turn-on animation: null = not yet visible, number = timestamp when first visible
  const tvTurnOnTimeRef = useRef<number | null>(null)
  const tvTurnOnRef = useRef(0) // 0→1 progress, shared with TVModel

  // Disable tone mapping for pixel art
  gl.toneMapping = THREE.NoToneMapping
  gl.autoClear = false

  const gameScene = useMemo(() => {
    const s = new THREE.Scene()
    s.background = new THREE.Color(0x000000)
    return s
  }, [])

  // Game camera uses constant world-space dimensions (independent of FBO resolution)
  const gameCamera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(
      GAME_WIDTH / -2, GAME_WIDTH / 2,
      GAME_HEIGHT / 2, GAME_HEIGHT / -2,
      0.1, 1000
    )
    cam.zoom = 20
    cam.position.set(-46, 5, 25)
    cam.updateProjectionMatrix()
    return cam
  }, [])

  const gameViewportWidth = GAME_HEIGHT / 8

  // FBO render resolution scales down on mobile/tablet — pixel art with NearestFilter
  // looks identical at lower resolution on smaller screens
  const [fboWidth, fboHeight] = useMemo((): [number, number] => {
    if (breakpoint === 'mobile') return [384, 480]
    if (breakpoint === 'tablet') return [512, 640]
    return [GAME_WIDTH, GAME_HEIGHT]
  }, [breakpoint])

  const fbo = useMemo(() => {
    return new THREE.WebGLRenderTarget(fboWidth, fboHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    })
  }, [fboWidth, fboHeight])

  useEffect(() => () => fbo.dispose(), [fbo])

  // Scene render target with depth texture for screen-space edge detection
  const sceneTarget = useMemo(() => {
    const dt = new THREE.DepthTexture(1, 1)
    dt.type = THREE.UnsignedIntType
    return new THREE.WebGLRenderTarget(1, 1, { depthTexture: dt })
  }, [])

  useEffect(() => () => {
    sceneTarget.depthTexture?.dispose()
    sceneTarget.dispose()
  }, [sceneTarget])

  // Edge detection shader — Roberts cross on linearized depth buffer
  const edgeMaterial = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      resolution: { value: new THREE.Vector2() },
      cameraNear: { value: 4.5 },
      cameraFar: { value: 1000.0 },
      edgeColor: { value: new THREE.Color('#ff4304') },
      edgeOpacity: { value: 1.0 },
      edgeThreshold: { value: 0.0175 },
      lineWidth: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform sampler2D tDepth;
      uniform vec2 resolution;
      uniform float cameraNear;
      uniform float cameraFar;
      uniform vec3 edgeColor;
      uniform float edgeOpacity;
      uniform float edgeThreshold;
      uniform float lineWidth;

      varying vec2 vUv;

      float getLinearDepth(vec2 uv) {
        float d = texture2D(tDepth, uv).r;
        float z = d * 2.0 - 1.0;
        return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
      }

      void main() {
        vec2 texel = lineWidth / resolution;

        float d0 = getLinearDepth(vUv);
        float d1 = getLinearDepth(vUv + vec2(texel.x, 0.0));
        float d2 = getLinearDepth(vUv + vec2(0.0, texel.y));
        float d3 = getLinearDepth(vUv + vec2(texel.x, texel.y));

        // Roberts cross on linearized depth, normalized by distance
        float edge = sqrt(pow(d0 - d3, 2.0) + pow(d1 - d2, 2.0)) / d0;

        vec4 color = texture2D(tDiffuse, vUv);
        float edgeFactor = smoothstep(edgeThreshold * 0.5, edgeThreshold, edge);

        gl_FragColor = mix(color, vec4(edgeColor, color.a), edgeFactor * edgeOpacity);

        // Manual linear → sRGB encoding (scene FBO stores linear values)
        gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(1.0 / 2.2));
      }
    `,
    depthTest: false,
    depthWrite: false,
    toneMapped: false,
  }), [])

  // Full-screen quad for edge detection compositing
  const { edgeQuadScene, edgeQuadCamera } = useMemo(() => {
    const s = new THREE.Scene()
    const c = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    s.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), edgeMaterial))
    return { edgeQuadScene: s, edgeQuadCamera: c }
  }, [edgeMaterial])

  useEffect(() => () => edgeMaterial.dispose(), [edgeMaterial])

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
    if (!isVisible) return

    const render = () => {
      const { smoothProgress } = scroll.getState()

      // smoothProgress maps 0→1 over the canvas section scroll range
      // (set by ScrollAttacher's setScrollRegion). Camera uses full range.
      const cameraProgress = smoothProgress

      // Interpolate camera position/lookAt from scroll keyframes
      if (camera instanceof THREE.PerspectiveCamera) {

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

        // Interpolate FOV if either keyframe specifies one (default 5)
        const fromFov = from.fov ?? 5
        const toFov = to.fov ?? 5
        if (fromFov !== toFov || camera.fov !== fromFov) {
          camera.fov = lerp(fromFov, toFov, eased)
          camera.updateProjectionMatrix()
        }
      }

      // Only render game FBO when camera is close enough to see the TV.
      // Starts at ~0.085 so the turn-on animation plays as the first caption fades in.
      const tvVisible = cameraProgress > 0.085 && cameraProgress < 0.9
      if (tvVisible) {
        // Start turn-on timer on first visibility
        if (tvTurnOnTimeRef.current === null) {
          tvTurnOnTimeRef.current = performance.now()
        }
        const TURN_ON_MS = 1500
        const elapsed = performance.now() - tvTurnOnTimeRef.current
        tvTurnOnRef.current = Math.min(1, elapsed / TURN_ON_MS)

        gl.setRenderTarget(fbo)
        gl.setClearColor(0x000000, 1)
        gl.clear()
        gl.render(gameScene, gameCamera)
      }

      // Pass 2: Render main scene to FBO with depth (linear color space)
      const savedColorSpace = gl.outputColorSpace
      gl.outputColorSpace = THREE.LinearSRGBColorSpace

      gl.getDrawingBufferSize(_drawSize)
      if (sceneTarget.width !== _drawSize.x || sceneTarget.height !== _drawSize.y) {
        sceneTarget.setSize(_drawSize.x, _drawSize.y)
      }

      gl.setRenderTarget(sceneTarget)
      gl.setClearColor(0x000000, 0)
      gl.clear()
      gl.render(scene, camera)

      gl.outputColorSpace = savedColorSpace

      // Pass 3: Edge detection + compositing to screen (manual sRGB in shader)
      edgeMaterial.uniforms.tDiffuse.value = sceneTarget.texture
      edgeMaterial.uniforms.tDepth.value = sceneTarget.depthTexture
      edgeMaterial.uniforms.resolution.value.copy(_drawSize)
      if (camera instanceof THREE.PerspectiveCamera) {
        edgeMaterial.uniforms.cameraNear.value = camera.near
        edgeMaterial.uniforms.cameraFar.value = camera.far
      }

      gl.setRenderTarget(null)
      gl.setClearColor(0x000000, 0)
      gl.clear()
      gl.render(edgeQuadScene, edgeQuadCamera)
    }
    ticker.add(render)
    return () => ticker.remove(render)
  }, [gl, scene, camera, gameScene, gameCamera, fbo, isVisible, scroll, keyframes, sceneTarget, edgeMaterial, edgeQuadScene, edgeQuadCamera])

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
            turnOnRef={tvTurnOnRef}
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
      shadows
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
