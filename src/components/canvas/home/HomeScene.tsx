import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { useRef, useEffect, Suspense, useState, useMemo } from 'react'
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
  isVisible = true,
  tipPosRef,
  externalDraggingRef
}: {
  scale: number
  position: [number, number, number]
  rotation: [number, number, number]
  materialOverrides?: MaterialOverride[]
  scrollContainer?: React.RefObject<HTMLDivElement>
  isVisible?: boolean
  tipPosRef?: React.RefObject<THREE.Vector3>
  externalDraggingRef?: React.RefObject<boolean>
}) {
  const groupRef = useRef<THREE.Group>(null!)
  const gltf = useLoader(GLTFLoader, '/pen2.glb')
  const { camera, gl } = useThree()
  const timeRef = useRef(0)
  const offsetRef = useRef({ x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 })

  // Pre-allocated objects for tip position computation (no GC pressure)
  const tipOffsetVec = useRef(new THREE.Vector3())
  const tipEuler = useRef(new THREE.Euler())
  const TIP_LOCAL_OFFSET: [number, number, number] = [0, 0, 0]

  // Viewport-dependent position and rotation (same pattern as CameraController)
  const { isMobileOnly, isTabletDown, width } = useViewport()

  const adjustedPosition = useMemo((): [number, number, number] => {
    if (isMobileOnly) return position       // Mobile (< 768px)
    if (isTabletDown) return position        // Tablet (768–1023px)
    if (width < 1440) return position        // Desktop (1024–1439px)
    return position                          // Wide (>= 1440px)
  }, [isMobileOnly, isTabletDown, width, position])

  const adjustedRotation = useMemo((): [number, number, number] => {
    if (isMobileOnly) return rotation        // Mobile (< 768px)
    if (isTabletDown) return rotation         // Tablet (768–1023px)
    if (width < 1440) return rotation         // Desktop (1024–1439px)
    return rotation                           // Wide (>= 1440px)
  }, [isMobileOnly, isTabletDown, width, rotation])

  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const isHoveringRef = useRef(false)

  // Animated rotation tracked via ref for performance
  const currentRotationRef = useRef({ x: adjustedRotation[0], y: adjustedRotation[1], z: adjustedRotation[2] })
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

  // Sync rotation ref when viewport/prop changes (only when idle)
  useEffect(() => {
    if (!isDraggingRef.current && !rotationAnimRef.current) {
      currentRotationRef.current = { x: adjustedRotation[0], y: adjustedRotation[1], z: adjustedRotation[2] }
    }
  }, [adjustedRotation])

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
      const hoverX = adjustedPosition[0] + ox
      const hoverY = adjustedPosition[1] + oy + riseOffset
      const hoverZ = adjustedPosition[2] + oz

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

      // Compute tip world position for trail
      if (tipPosRef) {
        const gp = groupRef.current.position
        tipEuler.current.set(r.x, r.y, r.z)
        tipOffsetVec.current.set(TIP_LOCAL_OFFSET[0], TIP_LOCAL_OFFSET[1], TIP_LOCAL_OFFSET[2])
        tipOffsetVec.current.applyEuler(tipEuler.current)
        tipOffsetVec.current.multiplyScalar(scale)
        tipPosRef.current.set(
          gp.x + tipOffsetVec.current.x,
          gp.y + tipOffsetVec.current.y,
          gp.z + tipOffsetVec.current.z
        )
      }
    }

    ticker.add(hover)
    return () => ticker.remove(hover)
  }, [adjustedPosition, isVisible, riseOffset, gltf])

  // Convert screen coordinates to world position on the pen's z-plane
  const screenToWorld = (clientX: number, clientY: number): THREE.Vector3 => {
    const ndc = new THREE.Vector3(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
      0.5
    )
    ndc.unproject(camera)
    const dir = ndc.sub(camera.position).normalize()
    const dist = (adjustedPosition[2] - camera.position.z) / dir.z
    return camera.position.clone().add(dir.multiplyScalar(dist))
  }

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    isDraggingRef.current = true
    gl.domElement.style.pointerEvents = 'auto'
    if (externalDraggingRef) externalDraggingRef.current = true
    document.body.style.cursor = 'grabbing'
    document.body.style.touchAction = 'none'

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

      const handleTouchMove = (e: TouchEvent) => {
        if (e.touches.length === 0) return
        if (e.cancelable) e.preventDefault()
        const touch = e.touches[0]
        const worldPos = screenToWorld(touch.clientX, touch.clientY)
        dragTargetRef.current = { x: worldPos.x, y: worldPos.y, z: worldPos.z }
      }

      const handleGlobalUp = () => {
        isDraggingRef.current = false
        if (externalDraggingRef) externalDraggingRef.current = false
        setIsDragging(false)
        document.body.style.cursor = 'auto'
        document.body.style.touchAction = ''

        if (isHoveringRef.current) {
          gl.domElement.style.pointerEvents = 'auto'
        } else {
          gl.domElement.style.pointerEvents = 'none'
        }

        // Stop rotation anim if still running
        rotationAnimRef.current?.stop()

        // Animate rotation back to rest (normalize so each axis takes shortest path)
        const curRot = currentRotationRef.current
        rotationAnimRef.current = new Animation({
          from: { ...curRot },
          to: {
            x: normalizeAngle(adjustedRotation[0], curRot.x),
            y: normalizeAngle(adjustedRotation[1], curRot.y),
            z: normalizeAngle(adjustedRotation[2], curRot.z),
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
      window.addEventListener('touchmove', handleTouchMove, { passive: false })
      window.addEventListener('touchend', handleGlobalUp)
      window.addEventListener('touchcancel', handleGlobalUp)

      return () => {
        window.removeEventListener('mousemove', handleGlobalMove)
        window.removeEventListener('mouseup', handleGlobalUp)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('touchend', handleGlobalUp)
        window.removeEventListener('touchcancel', handleGlobalUp)
      }
    }
  }, [isDragging, adjustedRotation, adjustedPosition, riseOffset])

  return (
    <group
      ref={groupRef}
      scale={scale}
      onPointerDown={handlePointerDown}
      onPointerOver={(e) => {
        e.stopPropagation()
        if (!isDragging) document.body.style.cursor = 'grab'
        isHoveringRef.current = true
        gl.domElement.style.pointerEvents = 'auto'
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        if (!isDragging) document.body.style.cursor = 'auto'
        isHoveringRef.current = false
        if (!isDragging) gl.domElement.style.pointerEvents = 'none'
      }}
    >
      <primitive object={gltf.scene} />
    </group>
  )
}

/**
 * PenTrail - Dissipating trail that follows the pen tip (drag-only)
 */
const MAX_TRAIL_POINTS = 80

function PenTrail({
  tipPosRef,
  draggingRef,
  isVisible = true
}: {
  tipPosRef: React.RefObject<THREE.Vector3>
  draggingRef: React.RefObject<boolean>
  isVisible?: boolean
}) {
  const countRef = useRef(0)

  const { geometry, material, line } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAIL_POINTS * 3), 3))
    geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(MAX_TRAIL_POINTS), 1))
    geo.setDrawRange(0, 0)

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      vertexShader: `
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          gl_FragColor = vec4(color, vAlpha);
        }
      `,
      uniforms: {
        color: { value: new THREE.Color('#222222') }
      }
    })

    const l = new THREE.Line(geo, mat)
    l.frustumCulled = false
    return { geometry: geo, material: mat, line: l }
  }, [])

  // Dispose geometry and material on unmount
  useEffect(() => {
    return () => {
      geometry.dispose()
      material.dispose()
    }
  }, [geometry, material])

  // Update trail each tick
  useEffect(() => {
    if (!isVisible) return

    const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
    const alphaAttr = geometry.getAttribute('alpha') as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array
    const alphas = alphaAttr.array as Float32Array

    const update = () => {
      if (draggingRef.current) {
        // While dragging: record new positions
        const tp = tipPosRef.current
        const count = countRef.current

        // Shift all positions back by one slot
        for (let i = Math.min(count, MAX_TRAIL_POINTS - 1); i > 0; i--) {
          positions[i * 3] = positions[(i - 1) * 3]
          positions[i * 3 + 1] = positions[(i - 1) * 3 + 1]
          positions[i * 3 + 2] = positions[(i - 1) * 3 + 2]
        }

        // Insert new position at head
        positions[0] = tp.x
        positions[1] = tp.y
        positions[2] = tp.z

        // Grow count up to max
        if (count < MAX_TRAIL_POINTS) countRef.current = count + 1
        const currentCount = countRef.current

        // Update alphas: 1.0 at head, 0.0 at tail
        for (let i = 0; i < currentCount; i++) {
          alphas[i] = 1.0 - i / (currentCount - 1 || 1)
        }

        posAttr.needsUpdate = true
        alphaAttr.needsUpdate = true
        geometry.setDrawRange(0, currentCount)
      } else if (countRef.current > 0) {
        // After release: shrink trail from tail until gone
        countRef.current = Math.max(0, countRef.current - 2)
        const currentCount = countRef.current

        // Recompute alphas for shrinking trail
        for (let i = 0; i < currentCount; i++) {
          alphas[i] = 1.0 - i / (currentCount - 1 || 1)
        }

        alphaAttr.needsUpdate = true
        geometry.setDrawRange(0, currentCount)
      }
    }

    ticker.add(update)
    return () => ticker.remove(update)
  }, [isVisible, geometry, tipPosRef, draggingRef])

  return <primitive object={line} />
}

/**
 * CapMesh - Renders the cap.glb model in the scene
 */
function CapMesh({
  scale = 1.5,
  position = [-3, 0, 0],
  rotation = [0, 0, 0],
  materialOverrides = [],
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

  // Viewport-dependent position and rotation (same pattern as CameraController)
  const { isMobileOnly, isTabletDown, width } = useViewport()

  const adjustedPosition = useMemo((): [number, number, number] => {
    if (isMobileOnly) return position       // Mobile (< 768px)
    if (isTabletDown) return position        // Tablet (768–1023px)
    if (width < 1440) return position        // Desktop (1024–1439px)
    return position                          // Wide (>= 1440px)
  }, [isMobileOnly, isTabletDown, width, position])

  const adjustedRotation = useMemo((): [number, number, number] => {
    if (isMobileOnly) return rotation        // Mobile (< 768px)
    if (isTabletDown) return rotation         // Tablet (768–1023px)
    if (width < 1440) return rotation         // Desktop (1024–1439px)
    return rotation                           // Wide (>= 1440px)
  }, [isMobileOnly, isTabletDown, width, rotation])

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
      gltf.scene.rotation.set(adjustedRotation[0], adjustedRotation[1], adjustedRotation[2])
    }
  }, [gltf, adjustedRotation, materialOverrides])

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
          adjustedPosition[0] + offsetX,
          adjustedPosition[1] + offsetY + riseOffset,
          adjustedPosition[2] + offsetZ
        )
      }
    }

    ticker.add(hover)
    return () => ticker.remove(hover)
  }, [adjustedPosition, isVisible, riseOffset])

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
      let xPosition = 0 // Offset left so models appear on the right
      let yPosition = 0

      if (isMobileOnly) {
        // Mobile (< 768px): zoom way out, center models
        xPosition = 0
        yPosition = 0
        zPosition = 12
      } else if (isTabletDown) {
        // Tablet (768px - 1023px): zoom out, slight offset
        xPosition = 0
        zPosition = 10
      } else if (width < 1440) {
        // Desktop (1024px - 1439px): slight zoom out
        zPosition = 10
        xPosition = 0
        yPosition = 0
      }
      // Wide (>= 1440px): use defaults (x=-2, z=7)
      camera.position.x = xPosition
      camera.position.y = yPosition
      camera.position.z = zPosition
      camera.updateProjectionMatrix()

      const handleScroll = () => {
        const scrollY = window.scrollY
        
        // Calculate visible height at z=0 to sync 3D movement with DOM scroll
        const distance = camera.position.z
        const vFov = (camera.fov * Math.PI) / 180
        const visibleHeight = 2 * Math.tan(vFov / 2) * distance
        
        // Move camera down to make objects move up with the page content
        const yOffset = (scrollY / window.innerHeight) * visibleHeight
        camera.position.y = yPosition - yOffset
      }

      window.addEventListener('scroll', handleScroll)
      handleScroll() // Set initial position

      return () => window.removeEventListener('scroll', handleScroll)
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
  const penTipPosRef = useRef(new THREE.Vector3())
  const penDraggingRef = useRef(false)

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
          tipPosRef={penTipPosRef}
          externalDraggingRef={penDraggingRef}
        />

        {/* Trail following the pen tip */}
        <PenTrail tipPosRef={penTipPosRef} draggingRef={penDraggingRef} isVisible={isVisible} />

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
      eventSource={scrollContainer}
      eventPrefix="client"
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
