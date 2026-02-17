import { useEffect, useRef, useState, useMemo } from 'react'
import { useLoader, useThree } from '@react-three/fiber'
import { useScene } from '../../../context/SceneContext'
import { ticker } from '../../../utils/AnimationTicker'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { applyMaterialOverrides, type MaterialOverride } from '../home/materialUtils'
import { Animation, Easing } from '../../../utils/Animation'

/**
 * Normalize angle `a` to be within ±π of `ref` so interpolation takes the shortest path
 */
const normalizeAngle = (a: number, ref: number): number =>
  a - Math.round((a - ref) / (2 * Math.PI)) * 2 * Math.PI

// Trail constants
const MAX_TRAIL_POINTS = 80

/**
 * PenCapMesh - Combined pen + cap + trail rendered in the Experience3D R3F layer
 * Position uses CSS convention: Y+ is down (inverted to Three.js internally)
 */
function PenCapMesh({
  penPosition,
  capPosition,
  penScale,
  capScale,
  penRotation,
  capRotation,
  penMaterialOverrides = [],
  capMaterialOverrides = [],
}: {
  penPosition: [number, number, number]
  capPosition: [number, number, number]
  penScale: number
  capScale: number
  penRotation: [number, number, number]
  capRotation: [number, number, number]
  penMaterialOverrides?: MaterialOverride[]
  capMaterialOverrides?: MaterialOverride[]
}) {
  const { camera, gl, scene } = useThree()

  // Load models
  const penGltf = useLoader(GLTFLoader, '/pen2.glb')
  const capGltf = useLoader(GLTFLoader, '/cap.glb')

  // Refs
  const penGroupRef = useRef<THREE.Group>(null!)
  const capGroupRef = useRef<THREE.Group>(null!)
  const penTimeRef = useRef(0)
  const capTimeRef = useRef(0)
  const penOffsetRef = useRef({ x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 })
  const capOffsetRef = useRef({ x: Math.random() * Math.PI * 2, y: Math.random() * Math.PI * 2 })

  // Convert CSS Y to Three.js Y (Y inversion)
  const penPos3D: [number, number, number] = [penPosition[0], -penPosition[1], penPosition[2]]
  const capPos3D: [number, number, number] = [capPosition[0], -capPosition[1], capPosition[2]]

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const isDraggingRef = useRef(false)
  const isHoveringRef = useRef(false)
  const currentRotationRef = useRef({ x: penRotation[0], y: penRotation[1], z: penRotation[2] })
  const dragPositionRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const dragTargetRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const rotationAnimRef = useRef<Animation<{ x: number; y: number; z: number }> | null>(null)
  const tipPosRef = useRef(new THREE.Vector3())
  const trailDraggingRef = useRef(false)

  const DRAG_ROTATION: [number, number, number] = [Math.PI / 0.32, -Math.PI / 20, -36]

  // Apply material overrides
  useEffect(() => {
    if (penGltf.scene) applyMaterialOverrides(penGltf.scene, penMaterialOverrides)
  }, [penGltf, penMaterialOverrides])

  useEffect(() => {
    if (capGltf.scene) {
      applyMaterialOverrides(capGltf.scene, capMaterialOverrides)
      capGltf.scene.rotation.set(capRotation[0], capRotation[1], capRotation[2])
    }
  }, [capGltf, capMaterialOverrides, capRotation])

  // Set pen rotation synchronously
  useMemo(() => {
    penGltf.scene.rotation.set(penRotation[0], penRotation[1], penRotation[2])
  }, [penGltf, penRotation])

  // Pen hover animation
  useEffect(() => {
    const hover = () => {
      if (!penGroupRef.current || !penGltf.scene) return

      // Apply current rotation
      const r = currentRotationRef.current
      penGltf.scene.rotation.set(r.x, r.y, r.z)

      penTimeRef.current += 0.008
      const ox = Math.sin(penTimeRef.current * 0.7 + penOffsetRef.current.x) * 0.08
      const oy = Math.sin(penTimeRef.current * 0.5 + penOffsetRef.current.y) * 0.1
      const oz = Math.cos(penTimeRef.current * 0.6) * 0.02
      const hoverX = penPos3D[0] + ox
      const hoverY = penPos3D[1] + oy
      const hoverZ = penPos3D[2] + oz

      if (isDraggingRef.current) {
        if (dragPositionRef.current && dragTargetRef.current) {
          const dragLerp = 0.18
          dragPositionRef.current.x += (dragTargetRef.current.x - dragPositionRef.current.x) * dragLerp
          dragPositionRef.current.y += (dragTargetRef.current.y - dragPositionRef.current.y) * dragLerp
          dragPositionRef.current.z += (dragTargetRef.current.z - dragPositionRef.current.z) * dragLerp
          penGroupRef.current.position.set(
            dragPositionRef.current.x,
            dragPositionRef.current.y,
            dragPositionRef.current.z
          )
        }
      } else if (dragPositionRef.current) {
        // Returning to hover position
        const lerpFactor = 0.07
        dragPositionRef.current.x += (hoverX - dragPositionRef.current.x) * lerpFactor
        dragPositionRef.current.y += (hoverY - dragPositionRef.current.y) * lerpFactor
        dragPositionRef.current.z += (hoverZ - dragPositionRef.current.z) * lerpFactor
        penGroupRef.current.position.set(
          dragPositionRef.current.x,
          dragPositionRef.current.y,
          dragPositionRef.current.z
        )

        const dist = Math.abs(hoverX - dragPositionRef.current.x) +
                     Math.abs(hoverY - dragPositionRef.current.y) +
                     Math.abs(hoverZ - dragPositionRef.current.z)
        if (dist < 0.001) {
          dragPositionRef.current = null
        }
      } else {
        penGroupRef.current.position.set(hoverX, hoverY, hoverZ)
      }

      // Update tip position for trail
      const gp = penGroupRef.current.position
      tipPosRef.current.set(gp.x, gp.y, gp.z)
    }

    ticker.add(hover)
    return () => ticker.remove(hover)
  }, [penPos3D, penGltf])

  // Cap hover animation
  useEffect(() => {
    const hover = () => {
      if (!capGroupRef.current) return
      capTimeRef.current += 0.008
      const ox = Math.sin(capTimeRef.current * 0.7 + capOffsetRef.current.x) * 0.06
      const oy = Math.sin(capTimeRef.current * 0.5 + capOffsetRef.current.y) * 0.1
      const oz = Math.cos(capTimeRef.current * 0.6) * 0.02
      capGroupRef.current.position.set(
        capPos3D[0] + ox,
        capPos3D[1] + oy,
        capPos3D[2] + oz
      )
    }
    ticker.add(hover)
    return () => ticker.remove(hover)
  }, [capPos3D])

  // Convert screen coords to scene-space for drag
  const screenToWorld = (clientX: number, clientY: number): THREE.Vector3 => {
    const ndc = new THREE.Vector3(
      (clientX / window.innerWidth) * 2 - 1,
      -(clientY / window.innerHeight) * 2 + 1,
      0.5
    )
    ndc.unproject(camera)
    const dir = ndc.sub(camera.position).normalize()
    // Intersect with pen's z-plane in world space
    const penWorldZ = scene.position.z + penPos3D[2] * scene.scale.z
    const dist = (penWorldZ - camera.position.z) / dir.z
    const worldPoint = camera.position.clone().add(dir.multiplyScalar(dist))
    // Convert to scene space
    return new THREE.Vector3(
      (worldPoint.x - scene.position.x) / scene.scale.x,
      (worldPoint.y - scene.position.y) / scene.scale.y,
      penPos3D[2]
    )
  }

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    isDraggingRef.current = true
    trailDraggingRef.current = true
    document.body.style.cursor = 'grabbing'
    document.body.style.touchAction = 'none'

    rotationAnimRef.current?.stop()
    dragPositionRef.current = null
    dragTargetRef.current = null

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

    if (penGroupRef.current) {
      const p = penGroupRef.current.position
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
        trailDraggingRef.current = false
        setIsDragging(false)
        document.body.style.cursor = 'auto'
        document.body.style.touchAction = ''

        rotationAnimRef.current?.stop()

        const curRot = currentRotationRef.current
        rotationAnimRef.current = new Animation({
          from: { ...curRot },
          to: {
            x: normalizeAngle(penRotation[0], curRot.x),
            y: normalizeAngle(penRotation[1], curRot.y),
            z: normalizeAngle(penRotation[2], curRot.z),
          },
          duration: 600,
          easing: Easing.easeOutCubic,
          onUpdate: (value) => { currentRotationRef.current = value },
          onComplete: () => { rotationAnimRef.current = null }
        })
        rotationAnimRef.current.start()

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
  }, [isDragging, penRotation, penPos3D])

  // Trail geometry
  const { geometry: trailGeometry, material: trailMaterial, line: trailLine } = useMemo(() => {
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

  useEffect(() => {
    return () => {
      trailGeometry.dispose()
      trailMaterial.dispose()
    }
  }, [trailGeometry, trailMaterial])

  // Trail update
  const trailCountRef = useRef(0)
  useEffect(() => {
    const posAttr = trailGeometry.getAttribute('position') as THREE.BufferAttribute
    const alphaAttr = trailGeometry.getAttribute('alpha') as THREE.BufferAttribute
    const positions = posAttr.array as Float32Array
    const alphas = alphaAttr.array as Float32Array

    const update = () => {
      if (trailDraggingRef.current) {
        const tp = tipPosRef.current
        const count = trailCountRef.current

        for (let i = Math.min(count, MAX_TRAIL_POINTS - 1); i > 0; i--) {
          positions[i * 3] = positions[(i - 1) * 3]
          positions[i * 3 + 1] = positions[(i - 1) * 3 + 1]
          positions[i * 3 + 2] = positions[(i - 1) * 3 + 2]
        }

        positions[0] = tp.x
        positions[1] = tp.y
        positions[2] = tp.z

        if (count < MAX_TRAIL_POINTS) trailCountRef.current = count + 1
        const currentCount = trailCountRef.current

        for (let i = 0; i < currentCount; i++) {
          alphas[i] = 1.0 - i / (currentCount - 1 || 1)
        }

        posAttr.needsUpdate = true
        alphaAttr.needsUpdate = true
        trailGeometry.setDrawRange(0, currentCount)
      } else if (trailCountRef.current > 0) {
        trailCountRef.current = Math.max(0, trailCountRef.current - 2)
        const currentCount = trailCountRef.current

        for (let i = 0; i < currentCount; i++) {
          alphas[i] = 1.0 - i / (currentCount - 1 || 1)
        }

        alphaAttr.needsUpdate = true
        trailGeometry.setDrawRange(0, currentCount)
      }
    }

    ticker.add(update)
    return () => ticker.remove(update)
  }, [trailGeometry])

  return (
    <>
      {/* Pen */}
      <group
        ref={penGroupRef}
        position={penPos3D}
        scale={penScale}
        onPointerDown={handlePointerDown}
        onPointerOver={(e) => {
          e.stopPropagation()
          if (!isDragging) document.body.style.cursor = 'grab'
          isHoveringRef.current = true
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          if (!isDragging) document.body.style.cursor = 'auto'
          isHoveringRef.current = false
        }}
      >
        <primitive object={penGltf.scene} />
      </group>

      {/* Trail */}
      <primitive object={trailLine} />

      {/* Cap */}
      <group ref={capGroupRef} position={capPos3D} scale={capScale}>
        <primitive object={capGltf.scene} />
      </group>
    </>
  )
}

/**
 * PenIslandObject - Adds pen + cap 3D models to the Experience3D R3F layer
 * Renders inside an Island component (DOM context), adds 3D objects via SceneContext
 *
 * Position uses CSS convention: [x, y, z] where Y+ is down
 */
export function PenIslandObject({
  penPosition = [0, 0, 50],
  capPosition = [0, -200, 50],
  penScale = 30,
  capScale = 30,
  penRotation = [-Math.PI/2, -Math.PI/5, 36] as [number, number, number],
  capRotation = [-Math.PI/2, Math.PI/10, 0.5] as [number, number, number],
  penMaterialOverrides = [] as MaterialOverride[],
  capMaterialOverrides = [] as MaterialOverride[],
  zIndex = 10,
}: {
  penPosition?: [number, number, number]
  capPosition?: [number, number, number]
  penScale?: number
  capScale?: number
  penRotation?: [number, number, number]
  capRotation?: [number, number, number]
  penMaterialOverrides?: MaterialOverride[]
  capMaterialOverrides?: MaterialOverride[]
  zIndex?: number
}) {
  const { addObject, removeObject } = useScene()
  const objectId = useRef(`pen-island-${Math.random()}`).current

  useEffect(() => {
    const mesh = (
      <PenCapMesh
        penPosition={penPosition}
        capPosition={capPosition}
        penScale={penScale}
        capScale={capScale}
        penRotation={penRotation}
        capRotation={capRotation}
        penMaterialOverrides={penMaterialOverrides}
        capMaterialOverrides={capMaterialOverrides}
      />
    )

    addObject(objectId, mesh, zIndex)
    return () => removeObject(objectId)
  }, [penPosition, capPosition, penScale, capScale, penRotation, capRotation, penMaterialOverrides, capMaterialOverrides, zIndex])

  return null
}
