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
    const render = () => {
      const state = cameraContext.getState()

      // Keep camera at a fixed distance from origin to match orthographic-like behavior
      // The Z distance determines the perspective strength
      const baseCameraZ = 1000
      camera.position.set(0, 0, baseCameraZ)

      // Calculate the conversion factor from pixels to Three.js units
      // At z=0, we need 1 Three.js unit = 1 pixel on screen
      // For a perspective camera: visibleHeight = 2 * tan(fov/2) * distance
      // We want: visibleHeight (in Three.js units) = viewport height (in pixels)
      const fovRadians = camera instanceof THREE.PerspectiveCamera ? (camera.fov * Math.PI) / 180 : state.fov
      const viewportHeight = gl.domElement.clientHeight
      const visibleHeightAtZ0 = 2 * Math.tan(fovRadians / 2) * baseCameraZ
      const pixelToUnit = visibleHeightAtZ0 / viewportHeight

      // Instead of moving the camera, we move and scale the scene
      // This matches the CSS transform behavior: translate(x, y) scale(zoom)
      // Apply pixel-to-unit conversion so 1px in CSS = 1 unit in Three.js at z=0
      scene.position.set(
        state.position[0] * pixelToUnit,   // Same direction as CSS translate X
        -state.position[1] * pixelToUnit,  // Invert Y: CSS +Y is down, Three.js +Y is up
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

      camera.updateMatrixWorld()
      scene.updateMatrixWorld(true)

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
