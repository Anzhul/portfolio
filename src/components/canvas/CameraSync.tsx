import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useCamera } from '../../context/CameraContext'
import { ticker } from '../../utils/AnimationTicker'
import * as THREE from 'three'

/**
 * CameraSync Component
 *
 * Synchronizes the R3F perspective camera with the 2D CameraContext by transforming the scene.
 * Uses the global animation ticker to ensure smooth updates in sync with CSS transforms.
 * No interpolation is done here since CameraViewport already handles smoothing.
 *
 * Synchronization strategy:
 * - Camera stays fixed at (0, 0, baseCameraZ) for consistent perspective
 * - Calculates pixel-to-unit conversion: 1px in CSS = 1 Three.js unit at z=0 plane
 * - Scene transforms to match CSS: scene.position = cameraPosition * pixelToUnit (same direction)
 * - Scene scale matches CSS zoom: scene.scale = zoom (1:1 mapping)
 * - This ensures 3D objects at coordinates [x, y, 0] align with HTML elements at (x px, y px)
 */
function CameraSync() {
  const { camera, gl, scene } = useThree()
  const cameraContext = useCamera()

  // Render loop using ticker - directly use camera state without interpolation
  useEffect(() => {
    // Cache for pixel-to-unit conversion (only recalculate on resize or FOV change)
    const baseCameraZ = 1000
    let cachedPixelToUnit = 0
    let cachedViewportHeight = 0
    let cachedFov = 0

    // Calculate pixel-to-unit conversion (cached)
    const getPixelToUnit = (fovRadians: number, viewportHeight: number): number => {
      // Only recalculate if viewport height or FOV changed
      if (viewportHeight !== cachedViewportHeight || fovRadians !== cachedFov) {
        const visibleHeightAtZ0 = 2 * Math.tan(fovRadians / 2) * baseCameraZ
        cachedPixelToUnit = visibleHeightAtZ0 / viewportHeight
        cachedViewportHeight = viewportHeight
        cachedFov = fovRadians
      }
      return cachedPixelToUnit
    }

    const render = () => {
      const state = cameraContext.getState()

      //console.log(`🎬 CameraSync.render: Syncing camera to position: [${state.position[0].toFixed(2)}, ${state.position[1].toFixed(2)}], zoom: ${state.zoom.toFixed(2)}`)

      // Keep camera at a fixed distance from origin to match orthographic-like behavior
      // The Z distance determines the perspective strength
      // Increased from 1000 to 2000 for better quality when zoomed in
      camera.position.set(0, 0, baseCameraZ)
      camera.rotation.set(0, 0, 0) // Explicitly reset rotation to prevent auto-rotation

      // Get cached pixel-to-unit conversion (only recalculates on viewport/FOV change)
      const fovRadians = camera instanceof THREE.PerspectiveCamera ? (camera.fov * Math.PI) / 180 : state.fov
      const viewportHeight = gl.domElement.clientHeight
      const pixelToUnit = getPixelToUnit(fovRadians, viewportHeight)
      

      // Instead of moving the camera, we move and scale the scene
      // This matches the CSS transform behavior: translate(x, y) scale(zoom)
      // Apply pixel-to-unit conversion so 1px in CSS = 1 unit in Three.js at z=0
      const sceneX = state.truePosition[0] * pixelToUnit
      const sceneY = -state.truePosition[1] * pixelToUnit

      scene.position.set(
        sceneX,   // Same direction as CSS translate X
        sceneY,   // Invert Y: CSS +Y is down, Three.js +Y is up
        0
      )


      // Apply zoom as uniform scale to the scene (matches CSS scale())
      scene.scale.setScalar(state.zoom)

      // Update FOV
      if (camera instanceof THREE.PerspectiveCamera) {
        const fovDegrees = (state.fov * 180) / Math.PI
        camera.fov = fovDegrees
        camera.updateProjectionMatrix()
      }

      // Update scene matrix (non-recursive for better performance)
      // R3F handles camera matrix updates, and children will update their own matrices as needed
      scene.updateMatrixWorld(false)

      // Render the scene
      gl.render(scene, camera)
    }

    ticker.add(render)

    return () => {
      ticker.remove(render)
    }
  }, [camera, gl, scene, cameraContext])

  // No visual output - this component just syncs camera state
  return null
}

export default CameraSync
