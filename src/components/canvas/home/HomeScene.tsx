import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { useRef, useEffect, Suspense, useState } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import { useViewport } from '../../../context/ViewportContext'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { applyMaterialOverrides, type MaterialOverride } from './materialUtils'
import { Animation, Easing } from '../../../utils/Animation'

export interface HomeSceneProps {
  isVisible?: boolean
  scrollContainer?: React.RefObject<HTMLDivElement>
  penScale?: number
  capScale?: number
  penPosition?: [number, number, number]
  capPosition?: [number, number, number]
  penRotation?: [number, number, number]
  capRotation?: [number, number, number]
  penMaterialOverrides?: MaterialOverride[]
  capMaterialOverrides?: MaterialOverride[]
}

/**
 * Helper to get scroll progress from container ref without causing re-renders
 */
const getScrollProgress = (containerRef?: React.RefObject<HTMLDivElement>): number => {
  if (!containerRef?.current) return 0
  const container = containerRef.current
  const scrollTop = container.scrollTop
  const scrollHeight = container.scrollHeight - container.clientHeight
  return scrollHeight > 0 ? scrollTop / scrollHeight : 0
}

/**
 * Normalize angle `a` to be within ±π of `ref` so interpolation takes the shortest path
 */
const normalizeAngle = (a: number, ref: number): number =>
  a - Math.round((a - ref) / (2 * Math.PI)) * 2 * Math.PI

/**
 * PenMesh - Renders the pen.glb model in the scene
 */
function PenMesh({
  scale = 2,
  position = [3, 0, 0],
  rotation = [0, 0, 0],
  materialOverrides = [],
  scrollContainer,
  isVisible = true
}: {
  scale: number
  position: [number, number, number]
  rotation: [number, number, number]
  materialOverrides?: MaterialOverride[]
  scrollContainer?: React.RefObject<HTMLDivElement>
  isVisible?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const gltf = useLoader(GLTFLoader, '/pen2.glb')
  const { camera } = useThree()
  const timeRef = useRef(0)
  const offsetRef = useRef({ x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 })

  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)

  // Animated rotation tracked via ref for performance
  const currentRotationRef = useRef({ x: rotation[0], y: rotation[1], z: rotation[2] })
  // Drag world position (non-null while dragging or returning)
  const dragPositionRef = useRef<{ x: number; y: number; z: number } | null>(null)
  // Raw cursor target for eased drag following
  const dragTargetRef = useRef<{ x: number; y: number; z: number } | null>(null)
  // Animation instance refs so we can stop them
  const rotationAnimRef = useRef<Animation<{ x: number; y: number; z: number }> | null>(null)

  const DRAG_ROTATION: [number, number, number] = [Math.PI / 0.32, -Math.PI / 20, -36]

  // Rise-up animation on mount
  const [riseOffset, setRiseOffset] = useState(-3)
  const hasAnimatedRef = useRef(false)

  // Rise-up animation on first load
  useEffect(() => {
    if (!hasAnimatedRef.current && isVisible) {
      hasAnimatedRef.current = true

      // Add delay for staggered effect
      setTimeout(() => {
        const riseAnimation = new Animation({
          from: -3,
          to: 0,
          duration: 1200,
          easing: Easing.easeOutCubic,
          onUpdate: (value) => {
            setRiseOffset(value)
          }
        })

        riseAnimation.start()
      }, 450)
    }
  }, [isVisible])

  // Apply material overrides
  useEffect(() => {
    if (gltf.scene) {
      applyMaterialOverrides(gltf.scene, materialOverrides)
    }
  }, [gltf, materialOverrides])

  // Sync rotation ref when prop changes (only when idle)
  useEffect(() => {
    if (!isDraggingRef.current && !rotationAnimRef.current) {
      currentRotationRef.current = { x: rotation[0], y: rotation[1], z: rotation[2] }
    }
  }, [rotation])

  // Hovering animation + rotation application (runs every tick)
  useEffect(() => {
    if (!isVisible) return

    const hover = () => {
      if (!groupRef.current || !gltf.scene) return

      // Always apply current animated rotation
      const r = currentRotationRef.current
      gltf.scene.rotation.set(r.x, r.y, r.z)

      // Always advance hover time so phase stays continuous across states
      timeRef.current += 0.008

      // Compute the live hover target (base + sinusoidal offsets)
      const ox = Math.sin(timeRef.current * 0.7 + offsetRef.current.x) * 0.08
      const oy = Math.sin(timeRef.current * 0.5 + offsetRef.current.y) * 0.1
      const oz = Math.cos(timeRef.current * 0.6) * 0.02
      const hoverX = position[0] + ox
      const hoverY = position[1] + oy + riseOffset
      const hoverZ = position[2] + oz

      if (isDraggingRef.current) {
        // While dragging: ease position toward cursor target
        if (dragPositionRef.current && dragTargetRef.current) {
          const dragLerp = 0.18
          dragPositionRef.current.x += (dragTargetRef.current.x - dragPositionRef.current.x) * dragLerp
          dragPositionRef.current.y += (dragTargetRef.current.y - dragPositionRef.current.y) * dragLerp
          dragPositionRef.current.z += (dragTargetRef.current.z - dragPositionRef.current.z) * dragLerp

          groupRef.current.position.set(
            dragPositionRef.current.x,
            dragPositionRef.current.y,
            dragPositionRef.current.z
          )
        }
      } else if (dragPositionRef.current) {
        // Returning: lerp from drag position toward live hover target
        const lerpFactor = 0.07
        dragPositionRef.current.x += (hoverX - dragPositionRef.current.x) * lerpFactor
        dragPositionRef.current.y += (hoverY - dragPositionRef.current.y) * lerpFactor
        dragPositionRef.current.z += (hoverZ - dragPositionRef.current.z) * lerpFactor

        groupRef.current.position.set(
          dragPositionRef.current.x,
          dragPositionRef.current.y,
          dragPositionRef.current.z
        )

        // When close enough, hand off to idle hover seamlessly
        const dist = Math.abs(hoverX - dragPositionRef.current.x) +
                     Math.abs(hoverY - dragPositionRef.current.y) +
                     Math.abs(hoverZ - dragPositionRef.current.z)
        if (dist < 0.001) {
          dragPositionRef.current = null
        }
      } else {
        // Idle: gentle hover float
        groupRef.current.position.set(hoverX, hoverY, hoverZ)
      }
    }

    ticker.add(hover)
    return () => ticker.remove(hover)
  }, [position, isVisible, riseOffset, gltf])

  // Convert screen coordinates to world position on the pen's z-plane
  const screenToWorld = (clientX: number, clientY: number): THREE.Vector3 => {
    const ndc = new THREE.Vector3(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
      0.5
    )
    ndc.unproject(camera)
    const dir = ndc.sub(camera.position).normalize()
    const dist = (position[2] - camera.position.z) / dir.z
    return camera.position.clone().add(dir.multiplyScalar(dist))
  }

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    isDraggingRef.current = true
    document.body.style.cursor = 'grabbing'

    // Stop any in-progress rotation animation
    rotationAnimRef.current?.stop()
    dragPositionRef.current = null
    dragTargetRef.current = null

    // Animate rotation to drag configuration (normalize so each axis takes shortest path)
    const cur = currentRotationRef.current
    rotationAnimRef.current = new Animation({
      from: { ...cur },
      to: {
        x: normalizeAngle(DRAG_ROTATION[0], cur.x),
        y: normalizeAngle(DRAG_ROTATION[1], cur.y),
        z: normalizeAngle(DRAG_ROTATION[2], cur.z),
      },
      duration: 400,
      easing: Easing.easeOutCubic,
      onUpdate: (value) => { currentRotationRef.current = value },
      onComplete: () => { rotationAnimRef.current = null }
    })
    rotationAnimRef.current.start()

    // Snap drag position to current group position so there's no jump
    if (groupRef.current) {
      const p = groupRef.current.position
      dragPositionRef.current = { x: p.x, y: p.y, z: p.z }
    }
  }

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMove = (e: MouseEvent) => {
        const worldPos = screenToWorld(e.clientX, e.clientY)
        dragTargetRef.current = { x: worldPos.x, y: worldPos.y, z: worldPos.z }
      }

      const handleGlobalUp = () => {
        isDraggingRef.current = false
        setIsDragging(false)
        document.body.style.cursor = 'auto'

        // Stop rotation anim if still running
        rotationAnimRef.current?.stop()

        // Animate rotation back to rest (normalize so each axis takes shortest path)
        const curRot = currentRotationRef.current
        rotationAnimRef.current = new Animation({
          from: { ...curRot },
          to: {
            x: normalizeAngle(rotation[0], curRot.x),
            y: normalizeAngle(rotation[1], curRot.y),
            z: normalizeAngle(rotation[2], curRot.z),
          },
          duration: 600,
          easing: Easing.easeOutCubic,
          onUpdate: (value) => { currentRotationRef.current = value },
          onComplete: () => { rotationAnimRef.current = null }
        })
        rotationAnimRef.current.start()

        // Position return is handled by the hover callback's lerp
        // dragPositionRef stays non-null so the lerp knows to ease back
        dragTargetRef.current = null
      }

      window.addEventListener('mousemove', handleGlobalMove)
      window.addEventListener('mouseup', handleGlobalUp)

      return () => {
        window.removeEventListener('mousemove', handleGlobalMove)
        window.removeEventListener('mouseup', handleGlobalUp)
      }
    }
  }, [isDragging, rotation, position, riseOffset])

  return (
    <group
      ref={groupRef}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!isDragging) document.body.style.cursor = 'grab'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        if (!isDragging) document.body.style.cursor = 'auto'
      }}
    >
      <primitive object={gltf.scene} />
    </group>
  )
}

/**
 * CapMesh - Renders the cap.glb model in the scene
 */
function CapMesh({
  scale = 1.5,
  position = [-3, 0, 0],
  rotation = [0, 0, 0],
  materialOverrides = [],
  scrollContainer,
  isVisible = true
}: {
  scale: number
  position: [number, number, number]
  rotation: [number, number, number]
  materialOverrides?: MaterialOverride[]
  scrollContainer?: React.RefObject<HTMLDivElement>
  isVisible?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const gltf = useLoader(GLTFLoader, '/cap.glb')
  const timeRef = useRef(0)
  const offsetRef = useRef({ x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 })
  
  // Rise-up animation on mount
  const [riseOffset, setRiseOffset] = useState(-3)
  const hasAnimatedRef = useRef(false)

  // Rise-up animation on first load
  useEffect(() => {
    if (!hasAnimatedRef.current && isVisible) {
      hasAnimatedRef.current = true
      
      // Add slight delay for staggered effect
      setTimeout(() => {
        const riseAnimation = new Animation({
          from: -3,
          to: 0,
          duration: 1200,
          easing: Easing.easeOutCubic,
          onUpdate: (value) => {
            setRiseOffset(value)
          }
        })
        
        riseAnimation.start()
      }, 150)
    }
  }, [isVisible])

  // Apply rotation and material overrides
  useEffect(() => {
    if (gltf.scene) {
      // Apply material overrides
      applyMaterialOverrides(gltf.scene, materialOverrides)

      // Apply rotation directly to the loaded scene
      gltf.scene.rotation.set(rotation[0], rotation[1], rotation[2])
    }
  }, [gltf, rotation, materialOverrides])

  // Hovering animation - only runs when visible
  useEffect(() => {
    if (!isVisible) return

    const hover = () => {
      if (groupRef.current) {
        timeRef.current += 0.008
        const offsetX = Math.sin(timeRef.current * 0.7 + offsetRef.current.x) * 0.06
        const offsetY = Math.sin(timeRef.current * 0.5 + offsetRef.current.y) * 0.1
        const offsetZ = Math.cos(timeRef.current * 0.6) * 0.02

        groupRef.current.position.set(
          position[0] + offsetX,
          position[1] + offsetY + riseOffset,
          position[2] + offsetZ
        )
      }
    }

    ticker.add(hover)
    return () => ticker.remove(hover)
  }, [position, isVisible, riseOffset])

  return (
    <group ref={groupRef} scale={scale}>
      <primitive object={gltf.scene} />
    </group>
  )
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
      // Adjust camera position based on viewport width
      // Canvas is full-screen, so offset camera X to keep models on the right
      let zPosition = 7 // Default desktop
      let xPosition = -2 // Offset left so models appear on the right
      let yPosition = 0

      if (isMobileOnly) {
        // Mobile (< 768px): zoom way out, center models
        xPosition = 2.5
        yPosition = -2
        zPosition = 12
      } else if (isTabletDown) {
        // Tablet (768px - 1023px): zoom out, slight offset
        xPosition = -1.5
        zPosition = 10
      } else if (width < 1440) {
        // Desktop (1024px - 1439px): slight zoom out
        zPosition = 10
        xPosition = -1.5
        yPosition = 0
      }
      // Wide (>= 1440px): use defaults (x=-2, z=7)
      camera.position.x = xPosition
      camera.position.y = yPosition
      camera.position.z = zPosition
      camera.updateProjectionMatrix()
    }
  }, [camera, width, isMobileOnly, isTabletDown])

  return null
}

/**
 * RenderTrigger - Triggers manual renders for frameloop="never"
 * Uses the global AnimationTicker for synchronized rendering
 * Only renders when isVisible is true
 */
function RenderTrigger({ isVisible = true }: { isVisible?: boolean }) {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    if (!isVisible) return

    const render = () => {
      gl.render(scene, camera)
    }

    ticker.add(render)
    return () => ticker.remove(render)
  }, [gl, scene, camera, isVisible])

  return null
}

/**
 * Scene - Wrapper component with Suspense for async loading
 */
function Scene({
  isVisible = true,
  scrollContainer,
  penScale,
  capScale,
  penPosition = [3, 0, 0],
  capPosition = [-3, 0, 0],
  penRotation = [0, 0, 0],
  capRotation = [0, 0, 0],
  penMaterialOverrides,
  capMaterialOverrides
}: HomeSceneProps) {
  return (
    <>
      {/* Camera controller for responsive zoom */}
      <CameraController />

      {/* Render trigger for manual frameloop - pauses when not visible */}
      <RenderTrigger isVisible={isVisible} />

      {/* Lighting setup */}
      <ambientLight intensity={1} />
      <directionalLight position={[5, 5, 5]} intensity={1.5} />
      <directionalLight position={[-5, -3, -3]} intensity={0.5} />
      <pointLight position={[3, 0, 5]} intensity={0.3} color="#ff7700" />
      <pointLight position={[-3, 0, 5]} intensity={0.3} color="#5588ff" />

      {/* Models wrapped in Suspense for async loading */}
      <Suspense fallback={null}>
        {/* Pen model */}
        <PenMesh
          scale={penScale!}
          position={penPosition}
          rotation={penRotation}
          materialOverrides={penMaterialOverrides}
          scrollContainer={scrollContainer}
          isVisible={isVisible}
        />

        {/* Cap model */}
        <CapMesh
          scale={capScale!}
          position={capPosition}
          rotation={capRotation}
          materialOverrides={capMaterialOverrides}
          scrollContainer={scrollContainer}
          isVisible={isVisible}
        />

      </Suspense>
    </>
  )
}

/**
 * HomeScene - Combined 3D scene for Home page with both pen and cap models
 *
 * This component renders both the pen.glb and cap.glb models in a single canvas,
 * which is more efficient than having separate canvases.
 *
 * Uses manual rendering control via the global AnimationTicker for synchronized
 * performance across the app.
 *
 * @example
 * const LazyHomeScene = lazy(() => import('./HomeScene'))
 *
 * <Lazy3DObject
 *   loadStrategy="delayed"
 *   delay={1500}
 *   component={LazyHomeScene}
 *   componentProps={{
 *     penScale: 2,
 *     capScale: 1.5,
 *     penMaterialOverrides: [...]
 *   }}
 * />
 */
function HomeScene({
  isVisible = true,
  scrollContainer,
  penScale = 2,
  capScale = 1.5,
  penPosition = [3, 0, 0],
  capPosition = [-3, 0, 0],
  penRotation = [0, 0, 0],
  capRotation = [0, 0, 0],
  penMaterialOverrides,
  capMaterialOverrides
}: HomeSceneProps) {
  return (
    <Canvas
      className="home-scene-canvas"
      frameloop="never" // Manual control via ticker
      camera={{ position: [0, 0, 8], fov: 50 }}
      gl={{
        alpha: true,
        antialias: true,
        outputColorSpace: 'srgb',
      }}
    >
      <Scene
        isVisible={isVisible}
        scrollContainer={scrollContainer}
        penScale={penScale}
        capScale={capScale}
        penPosition={penPosition}
        capPosition={capPosition}
        penRotation={penRotation}
        capRotation={capRotation}
        penMaterialOverrides={penMaterialOverrides}
        capMaterialOverrides={capMaterialOverrides}
      />
    </Canvas>
  )
}

export default HomeScene
export type { MaterialOverride }
