import { useMemo, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { WALL_IMAGE_POSITION } from './HomeScene'
import { FrameModel } from '../game/TVModel'

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
const DOORWAY_Z = -5           // center of doorway along Z axis
const DOORWAY_WIDTH_Z = 10    // width of doorway opening along Z
const DOORWAY_HEIGHT = 15     // height from floor to top of opening

export function GalleryEnvironment({ tvPosition, vasePosition }: GalleryEnvironmentProps) {
  const floorY = tvPosition[1] + FLOOR_Y_OFFSET
  const wallZ = -20

  // Pedestal heights: from floor to object base
  const tvPedestalHeight = tvPosition[1] - floorY
  const vasePedestalHeight = vasePosition[1] - floorY

  const [floorTexture] = useState(() => {
    const tex = new THREE.TextureLoader().load('/about/laminate_floor.jpg')
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(0.5, 0.5)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  })

  const floorMaterial = useMemo(() => new THREE.MeshToonMaterial({
    map: floorTexture,
    color: '#ffffff',
    emissive: '#ffdcc6',
    emissiveIntensity: 0.15,
  }), [floorTexture])

  const wallMaterial = useMemo(() => new THREE.MeshToonMaterial({
    color: '#ffffff',
  }), [])

  const baseboardMaterial = useMemo(() => new THREE.MeshToonMaterial({
    color: '#f5eee2',
  }), [])

  const pedestalMaterial = useMemo(() => new THREE.MeshToonMaterial({
    color: '#ffffff',
  }), [])

  const exteriorMaterial = useMemo(() => new THREE.MeshToonMaterial({
    color: '#cbd6ff',
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
    const canvas = imageTexture.image as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!

    const imageUrl = '/about/Dream%20of%20Butterflies.webp'

    const loadWithImage = () =>
      new Promise<void>((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          if (cancelled) return
          ctx.drawImage(img, 0, 0, 2048, 512)
          imageTexture.needsUpdate = true
          resolve()
        }
        img.onerror = reject
        img.src = imageUrl
      })

    // Try createImageBitmap with resize (not supported in all browsers),
    // fall back to Image element decode
    fetch(imageUrl)
      .then(r => r.blob())
      .then(blob => createImageBitmap(blob, { resizeWidth: 2048, resizeHeight: 512 }))
      .then(bitmap => {
        if (cancelled) return
        ctx.drawImage(bitmap, 0, 0)
        bitmap.close()
        imageTexture.needsUpdate = true
      })
      .catch(() => {
        if (!cancelled) return loadWithImage()
      })

    return () => { cancelled = true }
  }, [imageTexture])

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

  const groupRef = useRef<THREE.Group>(null)

  // Freeze all static meshes — they never move, so skip per-frame matrix recalc
  useEffect(() => {
    if (!groupRef.current) return
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.updateMatrix()
        child.matrixAutoUpdate = false
      }
    })
  }, [])

  // Dispose materials and textures on unmount
  useEffect(() => {
    return () => {
      const materials = [floorMaterial, wallMaterial, baseboardMaterial, pedestalMaterial, exteriorMaterial]
      for (const mat of materials) {
        mat.dispose()
      }
      imageTexture.dispose()
      floorTexture.dispose()
    }
  }, [floorMaterial, wallMaterial, baseboardMaterial, pedestalMaterial, exteriorMaterial, imageTexture, floorTexture])

  return (
    <group ref={groupRef}>
      {/* Single directional light for toon shading */}
      <directionalLight
        position={[20, 35, 40]}
        intensity={3.25}
        color="#fff0f0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-near={10}
        shadow-camera-far={80}
        shadow-normalBias={0.02}
        shadow-intensity={0.45}
      />

      {/* Floor */}
      <mesh
        receiveShadow
        position={[ROOM_X_OFFSET - WALL_THICKNESS / 2, floorY - WALL_THICKNESS / 2, -8.75 - WALL_THICKNESS / 2]}
        material={floorMaterials}
      >
        <boxGeometry args={[FLOOR_WIDTH + WALL_THICKNESS, WALL_THICKNESS, FLOOR_DEPTH + WALL_THICKNESS]} />
      </mesh>

      {/* Back wall */}
      <mesh
        receiveShadow
        position={[ROOM_X_OFFSET, floorY + WALL_HEIGHT / 2, wallZ - WALL_THICKNESS / 2]}
        material={backWallMaterials}
      >
        <boxGeometry args={[WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS]} />
      </mesh>

      {/* Side wall — split into 3 segments around doorway opening */}
      {/* Segment 1: back portion (before doorway) */}
      <mesh
        receiveShadow
        position={[sideWallX, floorY + WALL_HEIGHT / 2, beforeDoorZ]}
        material={sideWallMaterials}
      >
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, beforeDoorDepth]} />
      </mesh>
      {/* Segment 2: front portion (after doorway) */}
      <mesh
        receiveShadow
        position={[sideWallX, floorY + WALL_HEIGHT / 2, afterDoorZ]}
        material={sideWallMaterials}
      >
        <boxGeometry args={[WALL_THICKNESS, WALL_HEIGHT, afterDoorDepth]} />
      </mesh>
      {/* Segment 3: lintel above doorway */}
      <mesh
        receiveShadow
        position={[sideWallX, lintelY, DOORWAY_Z]}
        material={lintelMaterials}
      >
        <boxGeometry args={[WALL_THICKNESS, lintelH, DOORWAY_WIDTH_Z]} />
      </mesh>

      {/* Baseboard — back wall */}
      <mesh
        receiveShadow
        position={[ROOM_X_OFFSET, floorY + BASEBOARD_HEIGHT / 2, wallZ + BASEBOARD_DEPTH / 2]}
        material={baseboardMaterial}
      >
        <boxGeometry args={[WALL_WIDTH, BASEBOARD_HEIGHT, BASEBOARD_DEPTH]} />
      </mesh>

      {/* Baseboard — side wall (split around doorway) */}
      <mesh
        receiveShadow
        position={[baseboardX, floorY + BASEBOARD_HEIGHT / 2, bbBeforeZ]}
        material={baseboardMaterial}
      >
        <boxGeometry args={[BASEBOARD_DEPTH, BASEBOARD_HEIGHT, bbBeforeDepth]} />
      </mesh>
      <mesh
        receiveShadow
        position={[baseboardX, floorY + BASEBOARD_HEIGHT / 2, bbAfterZ]}
        material={baseboardMaterial}
      >
        <boxGeometry args={[BASEBOARD_DEPTH, BASEBOARD_HEIGHT, bbAfterDepth]} />
      </mesh>

      {/* Baseboard — doorway jambs (wraps around interior of opening,
           extended by BASEBOARD_DEPTH on +x to cover side wall baseboard edge) */}
      {/* Back jamb — protrudes into doorway in +z */}
      <mesh
        receiveShadow
        position={[sideWallX + BASEBOARD_DEPTH / 2, floorY + BASEBOARD_HEIGHT / 2, doorZMin + BASEBOARD_DEPTH / 2]}
        material={baseboardMaterial}
      >
        <boxGeometry args={[WALL_THICKNESS + BASEBOARD_DEPTH, BASEBOARD_HEIGHT, BASEBOARD_DEPTH]} />
      </mesh>
      {/* Front jamb — protrudes into doorway in -z */}
      <mesh
        receiveShadow
        position={[sideWallX + BASEBOARD_DEPTH / 2, floorY + BASEBOARD_HEIGHT / 2, doorZMax - BASEBOARD_DEPTH / 2]}
        material={baseboardMaterial}
      >
        <boxGeometry args={[WALL_THICKNESS + BASEBOARD_DEPTH, BASEBOARD_HEIGHT, BASEBOARD_DEPTH]} />
      </mesh>

      {/* Pedestal 1 — TV */}
      {tvPedestalHeight > 0 && (
        <mesh
          castShadow
          position={[
            tvPosition[0],
            floorY + tvPedestalHeight / 2,
            tvPosition[2] - 1.25,
          ]}
          material={pedestalMaterial}
        >
          <boxGeometry args={[PEDESTAL_WIDTH, tvPedestalHeight, PEDESTAL_DEPTH]} />
        </mesh>
      )}

      {/* Pedestal 2 — Vase */}
      {vasePedestalHeight > 0 && (
        <mesh
          castShadow
          position={[
            vasePosition[0],
            floorY + vasePedestalHeight / 2,
            vasePosition[2],
          ]}
          material={pedestalMaterial}
        >
          <boxGeometry args={[PEDESTAL_WIDTH, vasePedestalHeight, PEDESTAL_DEPTH]} />
        </mesh>
      )}

      {/* 3D picture frame on back wall */}
      <FrameModel
        position={WALL_IMAGE_POSITION}
        scale={2.65}
        imageTexture={imageTexture}
      />
    </group>
  )
}
