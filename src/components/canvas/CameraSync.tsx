import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useCamera } from '../../context/CameraContext'
import { ticker } from '../../utils/AnimationTicker'
import * as THREE from 'three'

/**
 * CameraSync Component
 *
 * Synchronizes the R3F perspective camera with the 2D CameraContext.
 * Uses the global animation ticker to ensure smooth updates in sync with CSS transforms.
 *
 * Camera mapping:
 * - position[x, y, z] -> camera position in 3D space
 * - zoom -> affects camera position Z (closer = more zoom)
 * - fov -> perspective field of view
 */
function CameraSync() {
  const { camera, gl, scene } = useThree()
  const cameraContext = useCamera()

  // Use refs to track current values for smooth interpolation
  const currentPosRef = useRef({ x: 0, y: 0, z: 5 })
  const targetPosRef = useRef({ x: 0, y: 0, z: 5 })
  const currentZoomRef = useRef(1)
  const targetZoomRef = useRef(1)

  // Interpolation speed (0.12 matches CameraViewport easing)
  const LERP_SPEED = 0.12

  // Subscribe to camera context changes
  useEffect(() => {
    const updateTargets = () => {
      const state = cameraContext.getState()

      // Update target position
      targetPosRef.current.x = state.position[0]
      targetPosRef.current.y = -state.position[1] // Invert Y for 3D space convention
      targetPosRef.current.z = state.position[2]

      // Update target zoom
      targetZoomRef.current = state.zoom

      // Update FOV (immediate, no interpolation needed)
      if (camera instanceof THREE.PerspectiveCamera) {
        const fovDegrees = (state.fov * 180) / Math.PI
        camera.fov = fovDegrees
        camera.updateProjectionMatrix()
      }
    }

    // Set initial values
    updateTargets()
    currentPosRef.current = { ...targetPosRef.current }
    currentZoomRef.current = targetZoomRef.current

    // Subscribe to future changes
    return cameraContext.subscribe(updateTargets)
  }, [cameraContext, camera])

  // Render loop using ticker (same pattern as VaseR3F)
  useEffect(() => {
    const render = () => {
      // Smooth interpolation towards target values
      currentPosRef.current.x += (targetPosRef.current.x - currentPosRef.current.x) * LERP_SPEED
      currentPosRef.current.y += (targetPosRef.current.y - currentPosRef.current.y) * LERP_SPEED
      currentPosRef.current.z += (targetPosRef.current.z - currentPosRef.current.z) * LERP_SPEED
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * LERP_SPEED

      // Apply interpolated values to camera
      camera.position.set(
        currentPosRef.current.x,
        currentPosRef.current.y,
        currentPosRef.current.z
      )

      // Apply zoom as a scale factor to position.z for perspective effect
      // Higher zoom = camera moves closer (smaller z offset)
      // This mimics the CSS scale() behavior in 3D
      const zoomOffset = 1000 / currentZoomRef.current
      camera.position.z = currentPosRef.current.z + zoomOffset

      camera.updateMatrixWorld()

      // Render the scene
      gl.render(scene, camera)
    }

    ticker.add(render)

    return () => {
      ticker.remove(render)
    }
  }, [camera, gl, scene])

  // No visual output - this component just syncs camera state
  return null
}

export default CameraSync
