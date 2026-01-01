import { useRef, useEffect, useState } from 'react'
import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { EffectComposer, Outline } from '@react-three/postprocessing'
//import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { ticker } from '../../../utils/AnimationTicker'
import { Animation, Easing } from '../../../utils/Animation'
import { useMenu } from '../../../context/MenuContext'

function VaseMesh({ composerRef, isMobile, isMenuOpen }: { composerRef: React.MutableRefObject<any>, isMobile: boolean, isMenuOpen: boolean }) {
  const groupRef = useRef<THREE.Group>(null!)
  const { gl, scene: threeScene, camera } = useThree()
  const [meshes, setMeshes] = useState<THREE.Object3D[]>([])

  // Load GLTF model - get the entire scene
  const { scene } = useGLTF('/vase.glb')

  // Load texture
  const texture = useLoader(THREE.TextureLoader, '/texture.png')

  // Configure texture settings
  useEffect(() => {
    texture.flipY = false
    texture.minFilter = THREE.LinearFilter
    texture.magFilter = THREE.LinearFilter
    texture.anisotropy = gl.capabilities.getMaxAnisotropy()
    texture.needsUpdate = true
  }, [texture, gl])

  // Apply materials to all meshes and collect them for outline
  useEffect(() => {
    const collectedMeshes: THREE.Object3D[] = []

    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        collectedMeshes.push(mesh)

        // Apply texture to Vase_1
        if (mesh.name === 'Vase_1') {
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xB05248, // Base color
            map: texture, // Texture overlaid on top
            transparent: true,
            emissive: 0xB05248, // Emissive color (same as base color)
            emissiveMap: texture, // Use the same texture for emissive
            emissiveIntensity: 0.1, // Control glow intensity
          })
        } else {
          // Convert other meshes to MeshStandardMaterial with emissive properties
          mesh.material = new THREE.MeshStandardMaterial({
            color: 0xB05248,
            emissive: 0xB05248,
            emissiveIntensity: 0.1,
          })
        }
      }
    })

    setMeshes(collectedMeshes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texture])

  // Animation using custom Animation library - rotate 180 degrees every 8 seconds
  // Only animate when menu is open
  useEffect(() => {
    if (!isMenuOpen) return

    let currentAnimation: Animation<number> | null = null
    let timeoutId: number | null = null

    const startRotationAnimation = () => {
      if (!groupRef.current) return

      const currentRotation = groupRef.current.rotation.y
      const targetRotation = currentRotation + Math.PI // 180 degrees in radians

      currentAnimation = new Animation({
        from: currentRotation,
        to: targetRotation,
        duration: 1500, // 8 seconds
        easing: Easing.easeInOutCubic,
        onUpdate: (value) => {
          if (groupRef.current) {
            groupRef.current.rotation.y = value
          }
        },
        onComplete: () => {
          // Wait 5 seconds before starting the next rotation
          timeoutId = setTimeout(() => {
            startRotationAnimation()
          }, 1000)
        },
      })

      currentAnimation.start()
    }

    // Start the initial rotation
    startRotationAnimation()

    // Render loop - still needed for rendering
    const render = () => {
      //console.log('Rendering vase R3F');
      if (composerRef.current) {
        composerRef.current.render()
      } else {
        gl.render(threeScene, camera)
      }
    }

    ticker.add(render);

    return () => {
      ticker.remove(render)
      if (currentAnimation) {
        currentAnimation.stop()
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
    }
  }, [gl, threeScene, camera, composerRef, isMenuOpen])

  return (
    <>
      <ambientLight intensity={1.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <group ref={groupRef} position={isMobile ? [0, -2.5, -5] : [0, -2.5, -5]}>
        <primitive
          object={scene}
          position={isMobile ? [0, 0, 0] : [0, 0, 0]}
          rotation={[0, Math.PI/2, 0]}
          scale={1.6}
        />
      </group>
      <EffectComposer ref={composerRef}>
        <Outline
          selection={meshes}
          edgeStrength={0.5}
          pulseSpeed={0}
          visibleEdgeColor={0x000000}
          hiddenEdgeColor={0x000000}
          blur={true}
          xRay={false}
        />
      </EffectComposer>
    </>
  )
}

function VaseR3F() {
  const composerRef = useRef<any>(null)
  const { isMobile, isMenuOpen } = useMenu()
  const [shouldShow, setShouldShow] = useState(false)

  // Handle delayed hide when menu closes
  useEffect(() => {
    if (!isMenuOpen) {
      // Delay hiding the vase when menu closes
      const timeout = setTimeout(() => {
        setShouldShow(false)
      }, 600) // 600ms delay

      return () => clearTimeout(timeout)
    } else {
      // Show immediately when menu opens
      setShouldShow(true)
    }
  }, [isMenuOpen])

  // Don't render when menu is closed (with delay)
  if (!shouldShow) {
    return null
  }

  return (
    <Canvas
      className="vase-canvas"
      frameloop="never"
      style={{}}
      orthographic
      camera={{
        position: [0, 0, 0],
        zoom: isMobile ? 25  : 20,
      }}
    >
      <VaseMesh composerRef={composerRef} isMobile={isMobile} isMenuOpen={isMenuOpen} />
    </Canvas >
  )
}

// Preload the GLTF model
useGLTF.preload('/vase.glb')

export default VaseR3F
