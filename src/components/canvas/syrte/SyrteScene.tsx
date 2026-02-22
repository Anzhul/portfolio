import { Canvas, useThree } from '@react-three/fiber'
import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { TIFFLoader } from 'three/examples/jsm/loaders/TIFFLoader.js'
import { useLoader } from '@react-three/fiber'
import { ticker } from '../../../utils/AnimationTicker'

export interface SyrteSceneProps {
  isVisible?: boolean
  modelPath?: string
  colorMapPath?: string
  colorMapTifPath?: string
}

/**
 * RenderTrigger - Manual render control via the global animation ticker
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
 * TickerOrbitControls - OrbitControls updated via the global animation ticker
 */
function TickerOrbitControls({ isVisible = true }: { isVisible?: boolean }) {
  const { camera, gl } = useThree()
  const controlsRef = useRef<OrbitControls | null>(null)

  useEffect(() => {
    if (!isVisible) return

    const controls = new OrbitControls(camera, gl.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.enableZoom = false // Disable zoom by default
    controlsRef.current = controls

    const update = () => {
      controls.update()
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey || e.shiftKey) {
        controls.enableZoom = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      // Only disable if neither modifier is active
      if (!e.altKey && !e.shiftKey) {
        controls.enableZoom = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    ticker.add(update)
    return () => {
      ticker.remove(update)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      controls.dispose()
    }
  }, [camera, gl, isVisible])

  return null
}

/**
 * ZoomIn - Animates the camera from a far position to the target once ready
 */
function ZoomIn({ ready, isVisible = true }: { ready: boolean; isVisible?: boolean }) {
  const { camera } = useThree()
  const progressRef = useRef(0)
  const startPos = useRef(new THREE.Vector3(0, 8, 14))
  const endPos = useRef(new THREE.Vector3(0, 0.8, 1.4))

  useEffect(() => {
    if (!ready || !isVisible) return

    const animate = (_ts: number, dt: number) => {
      if (progressRef.current >= 1) return

      progressRef.current = Math.min(1, progressRef.current + dt * 0.0008)
      // Ease-out cubic
      const t = 1 - Math.pow(1 - progressRef.current, 3)

      camera.position.lerpVectors(startPos.current, endPos.current, t)
    }

    ticker.add(animate)
    return () => ticker.remove(animate)
  }, [camera, ready, isVisible])

  return null
}

/**
 * TerrainModel - Loads a GLTF/GLB terrain model with an optional color map overlay
 */
function TerrainModel({
  modelPath = '/syrte/syrte_terrain.glb',
  colorMapPath,
  colorMapTifPath,
  onTextureLoaded,
  visible = true,
  isVisible = true,
}: {
  modelPath?: string
  colorMapPath?: string
  colorMapTifPath?: string
  onTextureLoaded?: () => void
  visible?: boolean
  isVisible?: boolean
}) {
  const gltf = useLoader(GLTFLoader, modelPath)
  const groupRef = useRef<THREE.Group>(null!)

  // Recompute smooth normals to soften faceted shading
  useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        child.geometry.computeVertexNormals()
      }
    })
  }, [gltf])

  // Rotate slowly around Z-axis
  useEffect(() => {
    if (!isVisible) return

    const animate = (_t: number, dt: number) => {
      if (groupRef.current) {
        groupRef.current.rotation.y += 0.00005 * dt
      }
    }
    ticker.add(animate)
    return () => ticker.remove(animate)
  }, [isVisible])

  useEffect(() => {
    const mapPath = colorMapTifPath || colorMapPath
    if (!mapPath) {
      onTextureLoaded?.()
      return
    }

    const isTif = mapPath.endsWith('.tif') || mapPath.endsWith('.tiff')
    const loader = isTif ? new TIFFLoader() : new THREE.TextureLoader()
    loader.load(mapPath, (colorMap) => {
      colorMap.colorSpace = THREE.LinearSRGBColorSpace
      colorMap.flipY = false

      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material as THREE.MeshStandardMaterial
          material.map = colorMap
          
          // Boost saturation
          material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace(
              '#include <map_fragment>',
              `
              #include <map_fragment>
              // Saturation boost
              vec3 lumaWeights = vec3(0.299, 0.587, 0.114);
              float luminance = dot(diffuseColor.rgb, lumaWeights);
              diffuseColor.rgb = mix(vec3(luminance), diffuseColor.rgb, 1.6);
              `
            )
          }

          material.needsUpdate = true
        }
      })

      onTextureLoaded?.()
    })
  }, [gltf, colorMapPath, colorMapTifPath, onTextureLoaded])

  return (
    <group ref={groupRef}>
      <primitive object={gltf.scene} visible={visible} />
    </group>
  )
}

/**
 * Scene - Inner scene content
 */
function Scene({
  isVisible = true,
  modelPath,
  colorMapPath,
  colorMapTifPath,
}: SyrteSceneProps) {
  const [textureReady, setTextureReady] = useState(false)
  const handleTextureLoaded = useCallback(() => setTextureReady(true), [])

  return (
    <>
      <RenderTrigger isVisible={isVisible} />
      <TickerOrbitControls isVisible={isVisible} />
      <ZoomIn ready={textureReady} isVisible={isVisible} />

      {/* Lighting */}
      <ambientLight intensity={1.0} />
      <directionalLight position={[5, 5, 5]} intensity={2.0} />
      <directionalLight position={[-3, 3, -3]} intensity={0.8} />
      <pointLight position={[0, 5, 0]} intensity={1.0} />

      <Suspense fallback={null}>
        <TerrainModel
          modelPath={modelPath}
          colorMapPath={colorMapPath}
          colorMapTifPath={colorMapTifPath}
          onTextureLoaded={handleTextureLoaded}
          visible={textureReady}
          isVisible={isVisible}
        />
      </Suspense>
    </>
  )
}

/**
 * SyrteScene - R3F canvas for the Syrte project page
 * Uses frameloop="never" with the global AnimationTicker for render control.
 */
function SyrteScene({
  isVisible = true,
  modelPath,
  colorMapPath,
  colorMapTifPath,
}: SyrteSceneProps) {
  return (
    <Canvas
      className="syrte-scene-canvas"
      frameloop="never"
      camera={{ position: [0, 0, 10], fov: 50 }}
      gl={{
        alpha: true,
        antialias: true,
        outputColorSpace: 'srgb',
      }}
    >
      <Scene
        isVisible={isVisible}
        modelPath={modelPath}
        colorMapPath={colorMapPath}
        colorMapTifPath={colorMapTifPath}
      />
    </Canvas>
  )
}

export default SyrteScene
