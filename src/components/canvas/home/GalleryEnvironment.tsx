import { useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import { WALL_IMAGE_POSITION } from './HomeScene'

interface GalleryEnvironmentProps {
  tvPosition: [number, number, number]
  vasePosition: [number, number, number]
}

const FLOOR_WIDTH = 35
const FLOOR_DEPTH = 22.5
const WALL_WIDTH = 35
const WALL_HEIGHT = 20
const PEDESTAL_WIDTH = 4.0
const PEDESTAL_DEPTH = 4.0
const FLOOR_Y_OFFSET = -6.0 // floor sits below objects
const ROOM_X_OFFSET = 5 // shift room geometry in +x
const WALL_THICKNESS = 1.25
const BASEBOARD_HEIGHT = 0.8
const BASEBOARD_DEPTH = 0.1 // how much it protrudes from the wall
const IMAGE_FRAME_WIDTH = 20
const IMAGE_FRAME_HEIGHT = 5
const DOORWAY_Z = -5           // center of doorway along Z axis
const DOORWAY_WIDTH_Z = 7.5   // width of doorway opening along Z
const DOORWAY_HEIGHT = 15     // height from floor to top of opening

export function GalleryEnvironment({ tvPosition, vasePosition }: GalleryEnvironmentProps) {
  const floorY = tvPosition[1] + FLOOR_Y_OFFSET
  const wallZ = -20

  // Pedestal heights: from floor to object base
  const tvPedestalHeight = tvPosition[1] - floorY
  const vasePedestalHeight = vasePosition[1] - floorY

  const floorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#cfc6bd',
    roughness: 0.2,
    metalness: 0.05,
  }), [])

  const wallMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#f5f5f5',
    roughness: 0.95,
    metalness: 0.0,
  }), [])

  const baseboardMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#c8beb4',
    emissive: '#ffffff',
    emissiveIntensity: 0.15,
    roughness: 0.8,
    metalness: 0.0,
  }), [])

  const pedestalMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.6,
    metalness: 0.0,
  }), [])

  const exteriorMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    emissive: '#ffffff',
    emissiveIntensity: 0.15,
    roughness: 1.0,
    metalness: 0.0,
  }), [])

  // Load image manually with createImageBitmap to resize during decode,
  // avoiding a full 8192x2048 GPU texture upload that crashes WebGL context.
  const [imageTexture] = useState(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 512
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  })

  useEffect(() => {
    let cancelled = false
    fetch('/Dream of Butterflies.png')
      .then(r => r.blob())
      .then(blob => createImageBitmap(blob, { resizeWidth: 2048, resizeHeight: 512 }))
      .then(bitmap => {
        if (cancelled) return
        const canvas = imageTexture.image as HTMLCanvasElement
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()
        imageTexture.needsUpdate = true
      })
    return () => { cancelled = true }
  }, [imageTexture])

  const imageMaterial = useMemo(() => new THREE.MeshStandardMaterial({
    map: imageTexture,
    roughness: 0.9,
    metalness: 0.0,
  }), [imageTexture])

  // Per-face materials for boxes: [+x, -x, +y, -y, +z, -z]
  const floorMaterials = useMemo(() => {
    const ext = exteriorMaterial
    return [ext, ext, floorMaterial, ext, ext, ext]
  }, [floorMaterial, exteriorMaterial])

  const backWallMaterials = useMemo(() => {
    const ext = exteriorMaterial
    return [ext, ext, ext, ext, wallMaterial, ext]
  }, [wallMaterial, exteriorMaterial])

  const sideWallMaterials = useMemo(() => {
    const ext = exteriorMaterial
    return [wallMaterial, ext, ext, ext, ext, ext]
  }, [wallMaterial, exteriorMaterial])

  // Lintel above doorway — +x (interior) and -y (underside) visible
  const lintelMaterials = useMemo(() => {
    const ext = exteriorMaterial
    return [wallMaterial, ext, ext, wallMaterial, ext, ext]
  }, [wallMaterial, exteriorMaterial])

  // Side wall doorway geometry
  const sideWallX = -WALL_WIDTH / 2 + ROOM_X_OFFSET - WALL_THICKNESS / 2
  const sideWallZCenter = -8.75 - WALL_THICKNESS / 2
  const sideWallZTotal = FLOOR_DEPTH + WALL_THICKNESS
  const sideWallZMin = sideWallZCenter - sideWallZTotal / 2
  const sideWallZMax = sideWallZCenter + sideWallZTotal / 2
  const doorZMin = DOORWAY_Z - DOORWAY_WIDTH_Z / 2
  const doorZMax = DOORWAY_Z + DOORWAY_WIDTH_Z / 2

  // Wall segment before doorway (back portion)
  const beforeDoorDepth = doorZMin - sideWallZMin
  const beforeDoorZ = sideWallZMin + beforeDoorDepth / 2
  // Wall segment after doorway (front portion)
  const afterDoorDepth = sideWallZMax - doorZMax
  const afterDoorZ = doorZMax + afterDoorDepth / 2
  // Lintel above doorway
  const lintelH = WALL_HEIGHT - DOORWAY_HEIGHT
  const lintelY = floorY + DOORWAY_HEIGHT + lintelH / 2

  // Side baseboard split
  const baseboardX = -WALL_WIDTH / 2 + ROOM_X_OFFSET + BASEBOARD_DEPTH / 2
  const bbZMin = -8.75 - FLOOR_DEPTH / 2
  const bbZMax = -8.75 + FLOOR_DEPTH / 2
  const bbBeforeDepth = doorZMin - bbZMin
  const bbBeforeZ = bbZMin + bbBeforeDepth / 2
  const bbAfterDepth = bbZMax - doorZMax
  const bbAfterZ = doorZMax + bbAfterDepth / 2

  const ceilingY = floorY + WALL_HEIGHT

  // Spotlight targets — Object3Ds that spotlights aim at
  const tvTarget = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(tvPosition[0], tvPosition[1], tvPosition[2])
    return obj
  }, [tvPosition])

  const vaseTarget = useMemo(() => {
    const obj = new THREE.Object3D()
    obj.position.set(vasePosition[0], vasePosition[1], vasePosition[2])
    return obj
  }, [vasePosition])

  // 6 spotlight targets spread evenly across the image frame width
  const imageTargets = useMemo(() => {
    const halfWidth = IMAGE_FRAME_WIDTH / 2
    const count = 6
    const spacing = IMAGE_FRAME_WIDTH / (count - 1)
    return Array.from({ length: count }, (_, i) => {
      const obj = new THREE.Object3D()
      obj.position.set(
        WALL_IMAGE_POSITION[0] - halfWidth + spacing * i,
        WALL_IMAGE_POSITION[1],
        WALL_IMAGE_POSITION[2],
      )
      return obj
    })
  }, [])

  return (
    <group>
      {/* Spotlight targets (must be in scene graph) */}
      <primitive object={tvTarget} />
      <primitive object={vaseTarget} />
      {imageTargets.map((t, i) => <primitive key={i} object={t} />)}

      {/* Gallery spotlights — pedestal spots */}
      <spotLight
        position={[tvPosition[0], ceilingY - 1, tvPosition[2] + 4]}
        target={tvTarget}
        intensity={200}
        angle={0.45}
        penumbra={0.6}
        color="#fff3e6"
        castShadow
      />
      <spotLight
        position={[vasePosition[0], ceilingY - 1, vasePosition[2] + 4]}
        target={vaseTarget}
        intensity={250}
        angle={0.45}
        penumbra={0.6}
        color="#fff5e6"
        castShadow
      />

      {/* 6 smaller spots along the wall image */}
      {imageTargets.map((t, i) => (
        <spotLight
          key={i}
          position={[t.position.x, WALL_IMAGE_POSITION[1] + IMAGE_FRAME_HEIGHT / 2 + 5, WALL_IMAGE_POSITION[2] + 3]}
          target={t}
          intensity={80}
          angle={0.45}
          penumbra={0.8}
          color="#fff5e6"
        />
      ))}

      {/* Subtle ambient fill so shadows aren't pitch black */}
      <ambientLight intensity={0.3} />

      {/* Soft ceiling fill lights — even general illumination */}
      <pointLight position={[ROOM_X_OFFSET - 8, ceilingY - 2, -5]} intensity={15} distance={60} decay={1} color="#fff1e2" />
      <pointLight position={[ROOM_X_OFFSET + 8, ceilingY - 2, -5]} intensity={15} distance={60} decay={1} color="#ffecda" />
      <pointLight position={[ROOM_X_OFFSET + FLOOR_WIDTH / 2, ceilingY - 2, -8.75 + FLOOR_DEPTH / 2]} intensity={20} distance={60} decay={1} color="#ffecda" />

      {/* Floor */}
      <mesh
        position={[ROOM_X_OFFSET - WALL_THICKNESS / 2, floorY - WALL_THICKNESS / 2, -8.75 - WALL_THICKNESS / 2]}
        material={floorMaterials}
        receiveShadow
      >
        <boxGeometry args={[FLOOR_WIDTH + WALL_THICKNESS, WALL_THICKNESS, FLOOR_DEPTH + WALL_THICKNESS]} />
      </mesh>

      {/* Back wall */}
      <mesh
        position={[ROOM_X_OFFSET, floorY + WALL_HEIGHT / 2, wallZ - WALL_THICKNESS / 2]}
        material={backWallMaterials}
        receiveShadow
      >
        <boxGeometry args={[WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS]} />
      </mesh>

      {/* Side wall — split into 3 segments around doorway opening */}
      {/* Segment 1: back portion (before doorway) */}
      <mesh
        position={[sideWallX, floorY + WALL_HEIGHT / 2, beforeDoorZ]}
        material={sideWallMaterials}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, beforeDoorDepth]} />
      </mesh>
      {/* Segment 2: front portion (after doorway) */}
      <mesh
        position={[sideWallX, floorY + WALL_HEIGHT / 2, afterDoorZ]}
        material={sideWallMaterials}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, afterDoorDepth]} />
      </mesh>
      {/* Segment 3: lintel above doorway */}
      <mesh
        position={[sideWallX, lintelY, DOORWAY_Z]}
        material={lintelMaterials}
        receiveShadow
      >
        <boxGeometry args={[WALL_THICKNESS, lintelH, DOORWAY_WIDTH_Z]} />
      </mesh>

      {/* Baseboard — back wall */}
      <mesh
        position={[ROOM_X_OFFSET, floorY + BASEBOARD_HEIGHT / 2, wallZ + BASEBOARD_DEPTH / 2]}
        material={baseboardMaterial}
        receiveShadow
      >
        <boxGeometry args={[WALL_WIDTH, BASEBOARD_HEIGHT, BASEBOARD_DEPTH]} />
      </mesh>

      {/* Baseboard — side wall (split around doorway) */}
      <mesh
        position={[baseboardX, floorY + BASEBOARD_HEIGHT / 2, bbBeforeZ]}
        material={baseboardMaterial}
        receiveShadow
      >
        <boxGeometry args={[BASEBOARD_DEPTH, BASEBOARD_HEIGHT, bbBeforeDepth]} />
      </mesh>
      <mesh
        position={[baseboardX, floorY + BASEBOARD_HEIGHT / 2, bbAfterZ]}
        material={baseboardMaterial}
        receiveShadow
      >
        <boxGeometry args={[BASEBOARD_DEPTH, BASEBOARD_HEIGHT, bbAfterDepth]} />
      </mesh>

      {/* Pedestal 1 — TV */}
      {tvPedestalHeight > 0 && (
        <mesh
          position={[
            tvPosition[0],
            floorY + tvPedestalHeight / 2,
            tvPosition[2] - 1.25,
          ]}
          material={pedestalMaterial}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[PEDESTAL_WIDTH, tvPedestalHeight, PEDESTAL_DEPTH]} />
        </mesh>
      )}

      {/* Pedestal 2 — Vase */}
      {vasePedestalHeight > 0 && (
        <mesh
          position={[
            vasePosition[0],
            floorY + vasePedestalHeight / 2,
            vasePosition[2],
          ]}
          material={pedestalMaterial}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[PEDESTAL_WIDTH, vasePedestalHeight, PEDESTAL_DEPTH]} />
        </mesh>
      )}

      {/* Placeholder image frame on back wall */}
      <mesh
        position={WALL_IMAGE_POSITION}
        material={imageMaterial}
      >
        <planeGeometry args={[IMAGE_FRAME_WIDTH, IMAGE_FRAME_HEIGHT]} />
      </mesh>
    </group>
  )
}
