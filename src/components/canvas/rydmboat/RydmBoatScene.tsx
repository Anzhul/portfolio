import { Canvas, useThree } from '@react-three/fiber'
import { useRef, useEffect, Suspense } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import { useScroll } from '../../../context/ScrollContext'
import { useViewport } from '../../../context/ViewportContext'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { useLoader } from '@react-three/fiber'
import { applyMaterialOverrides, type MaterialOverride } from '../home/materialUtils'

export interface RydmBoatSceneProps {
  isVisible?: boolean
  scrollContainer: HTMLElement | null
  modelPath?: string
  modelScale?: number
  modelMaterialOverrides?: MaterialOverride[]
}

/**
 * ScrollAttacher - Attaches the scroll context to the container
 * Must be inside the Canvas to access useScroll from parent provider
 */
function ScrollAttacher({ scrollContainer }: { scrollContainer: HTMLElement | null }) {
  const scroll = useScroll()

  useEffect(() => {
    if (scrollContainer) {
      scroll.attach(scrollContainer)
      // Set smoothing for buttery animations
      scroll.setSmoothingFactor(0.08)
    }
    return () => scroll.detach()
  }, [scrollContainer, scroll])

  return null
}

/**
 * BoatMesh - The main 3D model with scroll-driven animations
 *
 * Demonstrates GSAP-like scroll triggers:
 * - 0% - 30%: Boat rotates into view
 * - 30% - 60%: Boat floats up and tilts
 * - 60% - 100%: Boat rotates out
 */
function BoatMesh({
  modelPath,
  scale = 1,
  materialOverrides = [],
  isVisible = true
}: {
  modelPath?: string
  scale: number
  materialOverrides?: MaterialOverride[]
  isVisible?: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const scroll = useScroll()

  // Use a placeholder geometry if no model path provided
  const hasModel = !!modelPath
  const gltf = hasModel ? useLoader(GLTFLoader, modelPath!) : null

  // Apply material overrides to loaded model
  useEffect(() => {
    if (gltf?.scene && materialOverrides.length > 0) {
      applyMaterialOverrides(gltf.scene, materialOverrides)
    }
  }, [gltf, materialOverrides])

  // Scroll-driven animation using the ticker (no React re-renders)
  useEffect(() => {
    if (!isVisible) return

    const animate = () => {
      if (!groupRef.current) return

      const state = scroll.getState()
      const progress = state.smoothProgress

      // === SCROLL TIMELINE ===
      // Phase 1: 0% - 30% - Rotate into view
      // Phase 2: 30% - 70% - Float and tilt
      // Phase 3: 70% - 100% - Rotate out

      // Rotation Y: Full 360 spin over entire scroll
      const rotationY = progress * Math.PI * 2

      // Rotation X: Tilt based on scroll phase
      let rotationX = 0
      if (progress < 0.3) {
        // Phase 1: Tilt forward as it enters
        rotationX = (progress / 0.3) * 0.3
      } else if (progress < 0.7) {
        // Phase 2: Subtle wave motion
        const phase2Progress = (progress - 0.3) / 0.4
        rotationX = 0.3 + Math.sin(phase2Progress * Math.PI * 2) * 0.15
      } else {
        // Phase 3: Tilt back as it exits
        const phase3Progress = (progress - 0.7) / 0.3
        rotationX = 0.3 - phase3Progress * 0.5
      }

      // Position Y: Float up in the middle section
      let positionY = 0
      if (progress >= 0.2 && progress <= 0.8) {
        const floatProgress = (progress - 0.2) / 0.6
        positionY = Math.sin(floatProgress * Math.PI) * 2
      }

      // Position Z: Come closer during middle section
      let positionZ = 0
      if (progress >= 0.3 && progress <= 0.7) {
        const zProgress = (progress - 0.3) / 0.4
        positionZ = Math.sin(zProgress * Math.PI) * 1.5
      }

      // Scale: Subtle pulse during interaction
      const scaleMultiplier = 1 + Math.sin(progress * Math.PI * 4) * 0.05

      // Apply transforms
      groupRef.current.rotation.set(rotationX, rotationY, 0)
      groupRef.current.position.set(0, positionY, positionZ)
      groupRef.current.scale.setScalar(scale * scaleMultiplier)
    }

    ticker.add(animate)
    return () => ticker.remove(animate)
  }, [scroll, scale, isVisible])

  return (
    <group ref={groupRef} scale={scale}>
      {hasModel && gltf ? (
        <primitive object={gltf.scene} />
      ) : (
        // Placeholder: A stylized boat shape using basic geometries
        <group>
          {/* Hull */}
          <mesh position={[0, -0.2, 0]} rotation={[0, 0, 0]}>
            <boxGeometry args={[2, 0.4, 0.8]} />
            <meshStandardMaterial color="#8B4513" roughness={0.7} />
          </mesh>
          {/* Deck */}
          <mesh position={[0, 0.1, 0]}>
            <boxGeometry args={[1.8, 0.15, 0.7]} />
            <meshStandardMaterial color="#DEB887" roughness={0.6} />
          </mesh>
          {/* Cabin */}
          <mesh position={[0.2, 0.5, 0]}>
            <boxGeometry args={[0.8, 0.6, 0.5]} />
            <meshStandardMaterial color="#F5F5DC" roughness={0.5} />
          </mesh>
          {/* Mast */}
          <mesh position={[-0.4, 0.8, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
            <meshStandardMaterial color="#4a3728" roughness={0.8} />
          </mesh>
          {/* Sail */}
          <mesh position={[-0.4, 1.0, 0.15]} rotation={[0, 0.1, 0]}>
            <planeGeometry args={[0.8, 0.9]} />
            <meshStandardMaterial color="#FFFAF0" roughness={0.9} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  )
}

/**
 * ScrollProgressIndicator - Visual debug showing scroll progress in the scene
 */
function ScrollProgressIndicator() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const scroll = useScroll()

  useEffect(() => {
    const update = () => {
      if (!meshRef.current) return
      const progress = scroll.getState().smoothProgress
      // Move indicator along X axis based on scroll
      meshRef.current.position.x = -3 + progress * 6
      // Color shifts from blue to green to red
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      const hue = (1 - progress) * 0.6 // Blue (0.6) to Red (0)
      material.color.setHSL(hue, 0.8, 0.5)
    }

    ticker.add(update)
    return () => ticker.remove(update)
  }, [scroll])

  return (
    <mesh ref={meshRef} position={[-3, -2.5, 0]}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshStandardMaterial color="#4488ff" />
    </mesh>
  )
}

/**
 * ProgressBar - A 3D progress bar showing scroll position
 */
function ProgressBar() {
  const barRef = useRef<THREE.Mesh>(null!)
  const scroll = useScroll()

  useEffect(() => {
    const update = () => {
      if (!barRef.current) return
      const progress = scroll.getState().smoothProgress
      barRef.current.scale.x = Math.max(0.01, progress)
      barRef.current.position.x = -3 + (progress * 3)
    }

    ticker.add(update)
    return () => ticker.remove(update)
  }, [scroll])

  return (
    <group position={[0, -2.5, 0]}>
      {/* Background bar */}
      <mesh position={[0, 0, -0.05]}>
        <boxGeometry args={[6, 0.1, 0.05]} />
        <meshStandardMaterial color="#333333" />
      </mesh>
      {/* Progress bar */}
      <mesh ref={barRef} position={[-3, 0, 0]}>
        <boxGeometry args={[6, 0.1, 0.05]} />
        <meshStandardMaterial color="#44aa88" />
      </mesh>
    </group>
  )
}

/**
 * CameraController - Adjusts camera based on viewport
 */
function CameraController() {
  const { camera } = useThree()
  const { isMobileOnly, isTabletDown } = useViewport()

  useEffect(() => {
    if (camera instanceof THREE.PerspectiveCamera) {
      let zPosition = 6

      if (isMobileOnly) {
        zPosition = 8
      } else if (isTabletDown) {
        zPosition = 7
      }

      camera.position.z = zPosition
      camera.updateProjectionMatrix()
    }
  }, [camera, isMobileOnly, isTabletDown])

  return null
}

/**
 * RenderTrigger - Manual render control via ticker
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
 * Scene - Inner scene content
 */
function Scene({
  isVisible = true,
  scrollContainer,
  modelPath,
  modelScale = 1,
  modelMaterialOverrides = []
}: RydmBoatSceneProps) {
  return (
    <>
      <ScrollAttacher scrollContainer={scrollContainer} />
      <CameraController />
      <RenderTrigger isVisible={isVisible} />

      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={1.2} />
      <directionalLight position={[-3, 3, -3]} intensity={0.4} />
      <pointLight position={[0, 2, 3]} intensity={0.5} color="#88ccff" />

      <Suspense fallback={null}>
        <BoatMesh
          modelPath={modelPath}
          scale={modelScale}
          materialOverrides={modelMaterialOverrides}
          isVisible={isVisible}
        />
      </Suspense>

      {/* Visual scroll indicators */}
      <ProgressBar />
      <ScrollProgressIndicator />
    </>
  )
}

/**
 * RydmBoatScene - Scroll-driven 3D scene for the RydmBoat page
 *
 * Demonstrates the ScrollContext with GSAP-like timeline animations:
 * - Smooth scroll tracking with configurable smoothing
 * - Phase-based animations (rotation, position, scale)
 * - Visual progress indicators
 *
 * @example
 * <ScrollProvider>
 *   <RydmBoatScene
 *     isVisible={true}
 *     scrollContainer={containerRef.current}
 *     modelPath="/boat.glb"  // Optional - uses placeholder if not provided
 *     modelScale={1.5}
 *   />
 * </ScrollProvider>
 */
function RydmBoatScene({
  isVisible = true,
  scrollContainer,
  modelPath,
  modelScale = 1,
  modelMaterialOverrides = []
}: RydmBoatSceneProps) {
  return (
    <Canvas
      className="rydmboat-scene-canvas"
      frameloop="never"
      camera={{ position: [0, 0, 6], fov: 50 }}
      gl={{
        alpha: true,
        antialias: true,
        outputColorSpace: 'srgb',
      }}
    >
      <Scene
        isVisible={isVisible}
        scrollContainer={scrollContainer}
        modelPath={modelPath}
        modelScale={modelScale}
        modelMaterialOverrides={modelMaterialOverrides}
      />
    </Canvas>
  )
}

export default RydmBoatScene
