import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { useRef, useEffect, Suspense, useState } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import { useViewport } from '../../../context/ViewportContext'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { applyMaterialOverrides, type MaterialOverride } from './materialUtils'
import { Animation, Easing } from '../../../utils/Animation'

export interface HomeSceneProps {
  scrollContainer?: React.RefObject<HTMLDivElement>
  penScale?: number
  capScale?: number
  inkScale?: number
  penPosition?: [number, number, number]
  capPosition?: [number, number, number]
  inkPosition?: [number, number, number]
  penRotation?: [number, number, number]
  capRotation?: [number, number, number]
  inkRotation?: [number, number, number]
  penMaterialOverrides?: MaterialOverride[]
  capMaterialOverrides?: MaterialOverride[]
  inkMaterialOverrides?: MaterialOverride[]
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
 * PenMesh - Renders the pen.glb model in the scene
 */
function PenMesh({
  scale = 2,
  position = [3, 0, 0],
  rotation = [0, 0, 0],
  materialOverrides = [],
  scrollContainer
}: {
  scale: number
  position: [number, number, number]
  rotation: [number, number, number]
  materialOverrides?: MaterialOverride[]
  scrollContainer?: React.RefObject<HTMLDivElement>
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const gltf = useLoader(GLTFLoader, '/pen.glb')
  const timeRef = useRef(0)
  const offsetRef = useRef({ x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 })

  const [isDragging, setIsDragging] = useState(false)
  const [dragRotation, setDragRotation] = useState(0)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null)
  const baseRotationRef = useRef(rotation[2])
  // Apply rotation and material overrides
  useEffect(() => {
    if (gltf.scene) {
      // Apply material overrides
      applyMaterialOverrides(gltf.scene, materialOverrides)

      // Apply rotation with drag rotation added
      gltf.scene.rotation.set(rotation[0], rotation[1], rotation[2] + dragRotation)
    }
  }, [gltf, rotation, materialOverrides, dragRotation])

  // Hovering animation
  useEffect(() => {
    const hover = () => {
      if (groupRef.current && !isDragging) {
        timeRef.current += 0.008
        const offsetX = Math.sin(timeRef.current * 0.7 + offsetRef.current.x) * 0.08
        const offsetY = Math.sin(timeRef.current * 0.5 + offsetRef.current.y) * 0.1
        const offsetZ = Math.cos(timeRef.current * 0.6) * 0.02

        groupRef.current.position.set(
          position[0] + offsetX,
          position[1] + offsetY,
          position[2] + offsetZ
        )
      }
    }

    ticker.add(hover)
    return () => {
      ticker.remove(hover)
    }
  }, [position, isDragging])

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    dragStartRef.current = { x: e.clientX, y: e.clientY }
    baseRotationRef.current = dragRotation
    document.body.style.cursor = 'grabbing'
  }

  useEffect(() => {
    if (isDragging) {
      const handleGlobalMove = (e: MouseEvent) => {
        if (dragStartRef.current) {
          const deltaX = e.clientX - dragStartRef.current.x

          // Rotation based solely on horizontal movement
          const rotationAmount = deltaX / 100

          setDragRotation(baseRotationRef.current + rotationAmount)
        }
      }

      const handleGlobalUp = () => {
        setIsDragging(false)
        dragStartRef.current = null
        // Reset cursor - check if still hovering over the pen
        document.body.style.cursor = 'auto'
      }

      window.addEventListener('mousemove', handleGlobalMove)
      window.addEventListener('mouseup', handleGlobalUp)

      return () => {
        window.removeEventListener('mousemove', handleGlobalMove)
        window.removeEventListener('mouseup', handleGlobalUp)
      }
    }
  }, [isDragging])

  return (
    <group
      ref={groupRef}
      scale={scale}
      position={position}
      onPointerDown={handlePointerDown}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!isDragging) {
          document.body.style.cursor = 'grab'
        }
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        if (!isDragging) {
          document.body.style.cursor = 'auto'
        }
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
  scrollContainer
}: {
  scale: number
  position: [number, number, number]
  rotation: [number, number, number]
  materialOverrides?: MaterialOverride[]
  scrollContainer?: React.RefObject<HTMLDivElement>
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const gltf = useLoader(GLTFLoader, '/cap.glb')
  const timeRef = useRef(0)
  const offsetRef = useRef({ x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 })

  // Apply rotation and material overrides
  useEffect(() => {
    if (gltf.scene) {
      // Apply material overrides
      applyMaterialOverrides(gltf.scene, materialOverrides)

      // Apply rotation directly to the loaded scene
      gltf.scene.rotation.set(rotation[0], rotation[1], rotation[2])
    }
  }, [gltf, rotation, materialOverrides])

  // Hovering animation
  useEffect(() => {
    const hover = () => {
      if (groupRef.current) {
        timeRef.current += 0.008
        const offsetX = Math.sin(timeRef.current * 0.7 + offsetRef.current.x) * 0.06
        const offsetY = Math.sin(timeRef.current * 0.5 + offsetRef.current.y) * 0.1
        const offsetZ = Math.cos(timeRef.current * 0.6) * 0.02

        groupRef.current.position.set(
          position[0] + offsetX,
          position[1] + offsetY,
          position[2] + offsetZ
        )
      }
    }

    ticker.add(hover)
    return () => ticker.remove(hover)
  }, [position])

  return (
    <group ref={groupRef} scale={scale} position={position}>
      <primitive object={gltf.scene} />
    </group>
  )
}

function InkMesh({
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  materialOverrides = [],
  scrollContainer
}: {
  scale: number
  position: [number, number, number]
  rotation: [number, number, number]
  materialOverrides?: MaterialOverride[]
  scrollContainer?: React.RefObject<HTMLDivElement>
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const gltf = useLoader(GLTFLoader, '/ink.glb')

  const [animatedRotation, setAnimatedRotation] = useState<[number, number, number]>(rotation)
  const clickAnimationRef = useRef<Animation<any> | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const timeRef = useRef(0)
  const offsetRef = useRef({ x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 })

  // Apply rotation and material overrides
  useEffect(() => {
    if (gltf.scene) {
      // Apply material overrides
      applyMaterialOverrides(gltf.scene, materialOverrides)

      // Apply rotation directly to the loaded scene
      gltf.scene.rotation.set(animatedRotation[0], animatedRotation[1], animatedRotation[2])

      // Ensure all meshes in the scene can receive pointer events
      gltf.scene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh
          mesh.raycast = THREE.Mesh.prototype.raycast
        }
      })
    }
  }, [gltf, animatedRotation, materialOverrides])

  // Hovering animation
  useEffect(() => {
    const hover = () => {
      if (groupRef.current) {
        timeRef.current += 0.008
        const offsetX = Math.sin(timeRef.current * 0.7 + offsetRef.current.x) * 0.08
        const offsetY = Math.sin(timeRef.current * 0.5 + offsetRef.current.y) * 0.1
        const offsetZ = Math.cos(timeRef.current * 0.6) * 0.02

        groupRef.current.position.set(
          position[0] + offsetX,
          position[1] + offsetY,
          position[2] + offsetZ
        )
      }
    }

    ticker.add(hover)
    return () => ticker.remove(hover)
  }, [position])

  // Handle click to rotate on z-axis
  const handleClick = () => {
    if (isAnimating) return // Prevent multiple clicks during animation

    setIsAnimating(true)

    // Stop any existing click animation
    if (clickAnimationRef.current) {
      clickAnimationRef.current.stop()
    }

    // Get current rotation
    const currentRotation = animatedRotation

    clickAnimationRef.current = new Animation({
      from: {
        rotZ: currentRotation[2]
      },
      to: {
        rotZ: currentRotation[2] + Math.PI // 180 degrees
      },
      duration: 500,
      easing: Easing.easeInOutCubic,
      onUpdate: (value) => {
        setAnimatedRotation([currentRotation[0], currentRotation[1], value.rotZ])
      },
      onComplete: () => {
        setIsAnimating(false)
      }
    })
    clickAnimationRef.current.start()
  }

  return (
    <group
      ref={groupRef}
      scale={scale}
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        handleClick()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        document.body.style.cursor = 'auto'
      }}
    >
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
      // Adjust camera Z position based on viewport width
      // Mobile: farther away, Desktop: closer
      let zPosition = 7 // Default desktop
      let xPosition = 0
      let yPosition = 0

      if (isMobileOnly) {
        // Mobile (< 768px): zoom way out
        xPosition = 2.5
        yPosition = -2
        zPosition = 12
      } else if (isTabletDown) {
        // Tablet (768px - 1023px): zoom out a bit
        zPosition = 10
      } else if (width < 1440) {
        // Desktop (1024px - 1439px): slight zoom out
        zPosition = 8
        xPosition = 1.5
        yPosition = 0
      }
      // Wide (>= 1440px): use default (8)
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
 */
function RenderTrigger() {
  const { gl, scene, camera } = useThree()

  useEffect(() => {
    const render = () => {
      gl.render(scene, camera)
    }

    ticker.add(render)
    return () => ticker.remove(render)
  }, [gl, scene, camera])

  return null
}

/**
 * Scene - Wrapper component with Suspense for async loading
 */
function Scene({
  scrollContainer,
  penScale,
  capScale,
  inkScale,
  penPosition = [3, 0, 0],
  capPosition = [-3, 0, 0],
  inkPosition = [0, 0, 0],
  penRotation = [0, 0, 0],
  capRotation = [0, 0, 0],
  inkRotation = [0, 0, 0],
  penMaterialOverrides,
  capMaterialOverrides,
  inkMaterialOverrides
}: HomeSceneProps) {
  return (
    <>
      {/* Camera controller for responsive zoom */}
      <CameraController />

      {/* Render trigger for manual frameloop */}
      <RenderTrigger />

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
        />

        {/* Cap model */}
        <CapMesh
          scale={capScale!}
          position={capPosition}
          rotation={capRotation}
          materialOverrides={capMaterialOverrides}
          scrollContainer={scrollContainer}
        />

        {/* Ink model 
        {inkScale && (
          <InkMesh
            scale={inkScale}
            position={inkPosition}
            rotation={inkRotation}
            materialOverrides={inkMaterialOverrides}
            scrollContainer={scrollContainer}
          />
        )}
          */}
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
  scrollContainer,
  penScale = 2,
  capScale = 1.5,
  inkScale,
  penPosition = [3, 0, 0],
  capPosition = [-3, 0, 0],
  inkPosition = [0, 0, 0],
  penRotation = [0, 0, 0],
  capRotation = [0, 0, 0],
  inkRotation = [0, 0, 0],
  penMaterialOverrides,
  capMaterialOverrides,
  inkMaterialOverrides
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
        scrollContainer={scrollContainer}
        penScale={penScale}
        capScale={capScale}
        inkScale={inkScale}
        penPosition={penPosition}
        capPosition={capPosition}
        inkPosition={inkPosition}
        penRotation={penRotation}
        capRotation={capRotation}
        inkRotation={inkRotation}
        penMaterialOverrides={penMaterialOverrides}
        capMaterialOverrides={capMaterialOverrides}
        inkMaterialOverrides={inkMaterialOverrides}
      />
    </Canvas>
  )
}

export default HomeScene
export type { MaterialOverride }
