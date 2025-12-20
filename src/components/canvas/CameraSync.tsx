import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useCamera } from '../../context/CameraContext'
import { ticker } from '../../utils/AnimationTicker'
import * as THREE from 'three'

/**
 * CameraSync Component
 *
 * Synchronizes the R3F perspective camera with the 2D CameraContext.
 * Uses the global animation ticker to ensure smooth updates in sync with CSS transforms.
 * No interpolation is done here since CameraViewport already handles smoothing.
 *
 * Camera mapping:
 * - position[x, y, z] -> camera position in 3D space
 * - zoom -> affects camera position Z (closer = more zoom)
 * - fov -> perspective field of view
 */
function CameraSync() {
  const { camera, gl, scene } = useThree()
  const cameraContext = useCamera()

  // Render loop using ticker - directly use camera state without interpolation
  useEffect(() => {
    const render = () => {
      const state = cameraContext.getState()

      // Apply camera position directly (no interpolation - already smoothed by CameraViewport)
      camera.position.set(
        state.position[0],
        -state.position[1], // Invert Y for 3D space convention
        state.position[2]
      )

      // Apply zoom as a scale factor to position.z for perspective effect
      // Higher zoom = camera moves closer (smaller z offset)
      // This mimics the CSS scale() behavior in 3D
      const zoomOffset = 1000 / state.zoom
      camera.position.z = state.position[2] + zoomOffset

      // Update FOV
      if (camera instanceof THREE.PerspectiveCamera) {
        const fovDegrees = (state.fov * 180) / Math.PI
        camera.fov = fovDegrees
        camera.updateProjectionMatrix()
      }

      camera.updateMatrixWorld()

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
