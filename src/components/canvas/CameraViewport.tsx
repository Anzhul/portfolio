import { useRef, useEffect, useMemo, useCallback, useImperativeHandle, forwardRef, Suspense, type ReactNode, type MouseEvent } from 'react'
import { useCamera } from '../../context/CameraContext'
import { useSceneObjects } from '../../context/SceneContext'
import { useViewport } from '../../context/ViewportContext'
import { ticker } from '../../utils/AnimationTicker'
import { Animation, Easing, type EasingFunction } from '../../utils/Animation'
import R3FCanvas from './R3FCanvas'
import './CameraViewport.scss'

interface CameraViewportProps {
  children?: ReactNode
}

export interface CameraViewportHandle {
  moveTo: (x: number, y: number, z?: number, options?: { animated?: boolean, duration?: number, easing?: EasingFunction | keyof typeof Easing, zoom?: number }) => void
  moveToIsland: (islandX: number, islandY: number, islandZ?: number, options?: { animated?: boolean, duration?: number, easing?: EasingFunction | keyof typeof Easing, zoom?: number }) => void
  zoomIn: () => void
  zoomOut: () => void
}

export const CameraViewport = forwardRef<CameraViewportHandle, CameraViewportProps>(
  ({ children }, ref) => {
  const camera = useCamera()
  const objects = useSceneObjects()
  const { isMobileOnly } = useViewport()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const activeAnimationRef = useRef<Animation<any> | null>(null)
  const isCustomAnimatingRef = useRef(false)
  const restartAnimationRef = useRef<(() => void) | null>(null)

  // Target values for trailing
  const initialZoom = isMobileOnly ? 0.3 : 0.45
  const targetZoomRef = useRef(initialZoom)
  const targetPositionRef = useRef<[number, number, number]>([0, 0, 5])
  const trueTargetPositionRef = useRef<[number, number, number]>([0, 0, 5])

  // Current interpolated values
  const currentZoomRef = useRef(initialZoom)
  const currentPositionRef = useRef<[number, number, number]>([0, 0, 5])
  const trueCurrentPositionRef = useRef<[number, number, number]>([0, 0, 5])

  /**
   * Low-level camera movement function (internal use)
   * Moves both HTML content (CSS transforms) and R3F camera using raw coordinates
   *
   * @param x - X position for CSS transform (viewport position in pixels)
   * @param y - Y position for CSS transform (viewport position in pixels)
   * @param trueX - X position for 3D scene
   * @param trueY - Y position for 3D scene
   * @param z - Z position (currently unused, reserved for future 3D features)
   * @param zoom - Optional zoom level (default: current zoom)
   * @param smooth - If true, smoothly interpolate to position. If false, jump immediately (default: false)
   */
  const moveToRaw = (
    x: number,
    y: number,
    trueX: number,
    trueY: number,
    z: number = 0,
    zoom?: number,
    smooth: boolean = false,
  ) => {

    const targetPos: [number, number, number] = [x, y, z]
    const truetargetPos: [number, number, number] = [trueX, trueY, z]
    const targetZoom = zoom ?? currentZoomRef.current

    if (smooth) {
      // Smooth transition: update target refs and let animation loop interpolate
      targetPositionRef.current = targetPos
      trueTargetPositionRef.current = truetargetPos
      targetZoomRef.current = targetZoom
      console.log(`🎯 CameraViewport.moveToRaw: Smooth transition to [${x}, ${y}, ${z}], zoom: ${targetZoom}`)
    } else {
      // Immediate jump: update both target and current refs
      targetPositionRef.current = targetPos
      currentPositionRef.current = targetPos
      trueTargetPositionRef.current = truetargetPos
      trueCurrentPositionRef.current = truetargetPos
      targetZoomRef.current = targetZoom
      currentZoomRef.current = targetZoom

      // Update camera context immediately (this triggers R3F CameraSync)
      camera.setTruePosition(truetargetPos)
      camera.setPosition(targetPos)
      camera.setZoom(targetZoom)

      // Update CSS transform immediately
      if (contentRef.current) {
        contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${targetZoom})`
      }

      //console.log(`⚡ CameraViewport.moveToRaw: Instant jump to [${x}, ${y}, ${z}], zoom: ${targetZoom}`)
    }
  }

  // Zoom control functions
  const zoomIn = () => {
    const container = containerRef.current
    if (!container) return

    const newZoom = Math.min(targetZoomRef.current + 0.15, 1)

    // Calculate the point in world space that's currently at the center
    const [camX, camY, camZ] = targetPositionRef.current
    const currentZoom = targetZoomRef.current

    const worldX = -camX / currentZoom
    const worldY = -camY / currentZoom

    // After zooming, keep the same world point at the center
    targetPositionRef.current = [
      -worldX * newZoom,
      -worldY * newZoom,
      camZ
    ]

    const [trueCamX, trueCamY, trueCamZ] = trueTargetPositionRef.current
    const trueWorldX = -trueCamX / currentZoom
    const trueWorldY = -trueCamY / currentZoom
    trueTargetPositionRef.current = [
      -trueWorldX * newZoom,
      -trueWorldY * newZoom,
      trueCamZ
    ]

    targetZoomRef.current = newZoom

    // Restart animation since target changed
    restartAnimationRef.current?.()
  }

  const zoomOut = () => {
    const container = containerRef.current
    if (!container) return

    const newZoom = Math.max(targetZoomRef.current - 0.15, 0.15)

    // Calculate the point in world space that's currently at the center
    const [camX, camY, camZ] = targetPositionRef.current
    const currentZoom = targetZoomRef.current

    const worldX = -camX / currentZoom
    const worldY = -camY / currentZoom

    // After zooming, keep the same world point at the center
    targetPositionRef.current = [
      -worldX * newZoom,
      -worldY * newZoom,
      camZ
    ]

    const [trueCamX, trueCamY, trueCamZ] = trueTargetPositionRef.current
    const trueWorldX = -trueCamX / currentZoom
    const trueWorldY = -trueCamY / currentZoom
    trueTargetPositionRef.current = [
      -trueWorldX * newZoom,
      -trueWorldY * newZoom,
      trueCamZ
    ]

    targetZoomRef.current = newZoom

    // Restart animation since target changed
    restartAnimationRef.current?.()
  }

  /**
   * Custom camera movement with precise duration and easing control
   * Uses the Animation class for frame-perfect animations
   *
   * @param x - Target X position for CSS transform
   * @param y - Target Y position for CSS transform
   * @param trueX - Target X position for 3D scene
   * @param trueY - Target Y position for 3D scene
   * @param z - Target Z position (default: 0)
   * @param zoom - Target zoom level (default: current zoom)
   * @param duration - Animation duration in milliseconds (default: 1000)
   * @param easing - Easing function or name from Easing (default: 'easeOutExpo')
   */
  const moveToCustom = (
    x: number,
    y: number,
    trueX: number,
    trueY: number,
    z: number = 0,
    zoom?: number,
    duration: number = 700,
    easing: EasingFunction | keyof typeof Easing = 'easeOutExpo'
  ) => {
    // Stop any existing animation
    if (activeAnimationRef.current) {
      activeAnimationRef.current.stop()
      activeAnimationRef.current = null
    }

    // Get easing function
    const easingFn = typeof easing === 'function' ? easing : Easing[easing]

    // Kill any trailing animation by snapping current to target
    // This prevents any interpolation artifacts when starting the custom animation
    currentPositionRef.current = [...targetPositionRef.current] as [number, number, number]
    trueCurrentPositionRef.current = [...trueTargetPositionRef.current] as [number, number, number]
    currentZoomRef.current = targetZoomRef.current

    // Capture starting values (now synchronized)
    const startPosition = [...currentPositionRef.current] as [number, number, number]
    const startTruePosition = [...trueCurrentPositionRef.current] as [number, number, number]
    const startZoom = currentZoomRef.current

    // Target values
    const targetZoom = zoom ?? startZoom

    console.log(`🎬 CameraViewport.moveToCustom: Animating to [${x}, ${y}, ${z}], zoom: ${targetZoom}, duration: ${duration}ms, easing: ${typeof easing === 'string' ? easing : 'custom'}`)

    // Set flag to disable trailing animation during custom animation
    isCustomAnimatingRef.current = true

    // Create animation for all values
    const animation = new Animation({
      from: {
        x: startPosition[0],
        y: startPosition[1],
        z: startPosition[2],
        trueX: startTruePosition[0],
        trueY: startTruePosition[1],
        trueZ: startTruePosition[2],
        zoom: startZoom
      },
      to: {
        x,
        y,
        z,
        trueX,
        trueY,
        trueZ: z,
        zoom: targetZoom
      },
      duration,
      easing: easingFn,
      onUpdate: (values) => {
        // Bypass the trailing animation by updating both target AND current refs
        // This gives us frame-perfect control over the animation
        const newPosition: [number, number, number] = [values.x, values.y, values.z]
        const newTruePosition: [number, number, number] = [values.trueX, values.trueY, values.trueZ]

        targetPositionRef.current = newPosition
        currentPositionRef.current = newPosition
        trueTargetPositionRef.current = newTruePosition
        trueCurrentPositionRef.current = newTruePosition
        targetZoomRef.current = values.zoom
        currentZoomRef.current = values.zoom

        // Update camera context
        camera.setPosition(newPosition)
        camera.setTruePosition(newTruePosition)
        camera.setZoom(values.zoom)

        // Update CSS transform directly for immediate visual feedback
        if (contentRef.current) {
          contentRef.current.style.transform = `translate(${values.x}px, ${values.y}px) scale(${values.zoom})`
        }
      },
      onComplete: () => {
        // Ensure exact final values (eliminate any floating-point errors)
        const finalPosition: [number, number, number] = [x, y, z]
        const finalTruePosition: [number, number, number] = [trueX, trueY, z]

        targetPositionRef.current = finalPosition
        currentPositionRef.current = finalPosition
        trueTargetPositionRef.current = finalTruePosition
        trueCurrentPositionRef.current = finalTruePosition
        targetZoomRef.current = targetZoom
        currentZoomRef.current = targetZoom

        // Update camera context with exact final values
        camera.setPosition(finalPosition)
        camera.setTruePosition(finalTruePosition)
        camera.setZoom(targetZoom)

        // Update CSS transform with exact final values
        if (contentRef.current) {
          contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${targetZoom})`
        }

        activeAnimationRef.current = null

        // Delay re-enabling trailing animation by one frame to ensure clean state
        requestAnimationFrame(() => {
          isCustomAnimatingRef.current = false
        })

        console.log('✅ CameraViewport.moveToCustom: Animation complete')
      }
    })

    activeAnimationRef.current = animation
    animation.start()
  }

  /**
   * High-level island navigation function
   * Handles all coordinate transformations internally
   *
   * @param islandX - Island X position in world space
   * @param islandY - Island Y position in world space
   * @param islandZ - Island Z position in world space (default: 0)
   * @param options - Navigation options
   * @param options.animated - Whether to animate the transition (default: true)
   * @param options.duration - Animation duration in ms (default: auto-calculated based on distance)
   * @param options.easing - Easing function (default: 'easeOutQuart')
   * @param options.zoom - Target zoom level (default: current zoom)
   */
  const moveToIsland = (
    islandX: number,
    islandY: number,
    islandZ: number = 0,
    options: {
      animated?: boolean
      duration?: number
      easing?: EasingFunction | keyof typeof Easing
      zoom?: number
    } = {}
  ) => {
    const {
      animated = true,
      duration,
      easing = 'easeOutQuart',
      zoom
    } = options

    // Get current zoom level
    const currentZoom = zoom ?? camera.getState().zoom

    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate zoom offsets (compensates for scale transform origin)
    const zoomOffsetX = (viewportWidth / 2) - (viewportWidth * currentZoom / 2)
    const zoomOffsetY = (viewportHeight / 2) - (viewportHeight * currentZoom / 2)

    // Camera position to center the island (negative island position)
    const cameraX = -islandX
    const cameraY = -islandY

    // Calculate screen coordinates for 2D CSS layer
    const screenLeft = (cameraX * currentZoom) - zoomOffsetX
    const screenTop = (cameraY * currentZoom) - zoomOffsetY
    const screenRight = screenLeft + viewportWidth
    const screenBottom = screenTop + viewportHeight

    // Calculate center of viewport (for 2D CSS layer)
    const viewportCenterX = (screenLeft + screenRight) / 2
    const viewportCenterY = (screenTop + screenBottom) / 2

    // Calculate true screen position (for 3D scene layer)
    const trueScreenLeft = islandX * currentZoom
    const trueScreenTop = islandY * currentZoom

    if (!animated) {
      // Instant jump using moveToRaw
      moveToRaw(
        viewportCenterX,
        viewportCenterY,
        -trueScreenLeft,
        -trueScreenTop,
        islandZ,
        currentZoom,
        false
      )
      console.log(`⚡ CameraViewport.moveToIsland: Instant jump to island [${islandX}, ${islandY}, ${islandZ}]`)
      return
    }

    // Calculate distance for auto-duration
    const currentPosition = camera.getState().position
    const [currentX, currentY] = currentPosition
    const deltaX = viewportCenterX - currentX
    const deltaY = viewportCenterY - currentY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Skip animation if already at target (within 1 pixel threshold)
    if (distance < 1) {
      console.log(`🗺️ CameraViewport.moveToIsland: Already at island [${islandX}, ${islandY}, ${islandZ}], skipping animation`)
      return
    }

    // Calculate duration based on distance if not provided
    let finalDuration = duration
    if (!finalDuration) {
      const minDuration = 800
      const maxDuration = 3000
      const durationPerPixel = 0.3
      const calculatedDuration = minDuration + (distance * durationPerPixel)
      finalDuration = Math.min(Math.max(calculatedDuration, minDuration), maxDuration)
    }

    console.log(`🎬 CameraViewport.moveToIsland: Animating to island [${islandX}, ${islandY}, ${islandZ}]`)
    console.log(`   Distance: ${distance.toFixed(0)}px, Duration: ${finalDuration.toFixed(0)}ms`)

    // Animated transition using moveToCustom
    moveToCustom(
      viewportCenterX,
      viewportCenterY,
      -trueScreenLeft,
      -trueScreenTop,
      islandZ,
      currentZoom,
      finalDuration,
      easing
    )
  }

  /**
   * High-level position navigation function
   * Moves camera to center on a specific world position
   *
   * @param x - Target X position in world space
   * @param y - Target Y position in world space
   * @param z - Target Z position in world space (default: 0)
   * @param options - Navigation options
   * @param options.animated - Whether to animate the transition (default: true)
   * @param options.duration - Animation duration in ms (default: auto-calculated based on distance)
   * @param options.easing - Easing function (default: 'easeOutQuart')
   * @param options.zoom - Target zoom level (default: current zoom)
   */
  const moveTo = (
    x: number,
    y: number,
    z: number = 0,
    options: {
      animated?: boolean
      duration?: number
      easing?: EasingFunction | keyof typeof Easing
      zoom?: number
    } = {}
  ) => {
    const {
      animated = true,
      duration,
      easing = 'easeOutQuart',
      zoom
    } = options

    // Get current zoom level
    const currentZoom = zoom ?? camera.getState().zoom

    // Get viewport dimensions
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    // Calculate zoom offsets (compensates for scale transform origin)
    const zoomOffsetX = (viewportWidth / 2) - (viewportWidth * currentZoom / 2)
    const zoomOffsetY = (viewportHeight / 2) - (viewportHeight * currentZoom / 2)

    // Camera position to center on target position
    const cameraX = -x
    const cameraY = -y

    // Calculate screen coordinates for 2D CSS layer
    const screenLeft = (cameraX * currentZoom) - zoomOffsetX
    const screenTop = (cameraY * currentZoom) - zoomOffsetY
    const screenRight = screenLeft + viewportWidth
    const screenBottom = screenTop + viewportHeight

    // Calculate center of viewport (for 2D CSS layer)
    const viewportCenterX = (screenLeft + screenRight) / 2
    const viewportCenterY = (screenTop + screenBottom) / 2

    // Calculate true screen position (for 3D scene layer)
    const trueScreenLeft = x * currentZoom
    const trueScreenTop = y * currentZoom

    if (!animated) {
      // Instant jump using moveToRaw
      moveToRaw(
        viewportCenterX,
        viewportCenterY,
        -trueScreenLeft,
        -trueScreenTop,
        z,
        currentZoom,
        false
      )
      console.log(`⚡ CameraViewport.moveTo: Instant jump to position [${x}, ${y}, ${z}]`)
      return
    }

    // Calculate distance for auto-duration
    const currentPosition = camera.getState().position
    const [currentX, currentY] = currentPosition
    const deltaX = viewportCenterX - currentX
    const deltaY = viewportCenterY - currentY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

    // Skip animation if already at target (within 1 pixel threshold)
    if (distance < 1) {
      console.log(`🗺️ CameraViewport.moveTo: Already at position [${x}, ${y}, ${z}], skipping animation`)
      return
    }

    // Calculate duration based on distance if not provided
    let finalDuration = duration
    if (!finalDuration) {
      const minDuration = 800
      const maxDuration = 3000
      const durationPerPixel = 0.3
      const calculatedDuration = minDuration + (distance * durationPerPixel)
      finalDuration = Math.min(Math.max(calculatedDuration, minDuration), maxDuration)
    }

    console.log(`🎬 CameraViewport.moveTo: Animating to position [${x}, ${y}, ${z}]`)
    console.log(`   Distance: ${distance.toFixed(0)}px, Duration: ${finalDuration.toFixed(0)}ms`)

    // Animated transition using moveToCustom
    moveToCustom(
      viewportCenterX,
      viewportCenterY,
      -trueScreenLeft,
      -trueScreenTop,
      z,
      currentZoom,
      finalDuration,
      easing
    )
  }

  // Expose functions via ref for external access
  useImperativeHandle(ref, () => ({
    moveTo,
    moveToIsland,
    zoomIn,
    zoomOut
  }))

  // Sort objects by zIndex for proper render order
  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
    [objects]
  )

  // Handle mouse wheel for custom zooming - prevent browser zoom but keep our scroll zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Cache container rect to avoid expensive getBoundingClientRect() on every wheel event
    let cachedRect = container.getBoundingClientRect()

    // Update cached rect on window resize (debounced to avoid excessive recalculations)
    let resizeTimeout: number | null = null
    const updateCachedRect = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = window.setTimeout(() => {
        if (container) {
          cachedRect = container.getBoundingClientRect()
        }
      }, 100) // Wait 100ms after resize stops before recalculating
    }
    window.addEventListener('resize', updateCachedRect)

    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault() // Always prevent default to block browser zoom

      // Only apply custom zoom if NOT a browser zoom gesture (Ctrl/Cmd not pressed)
      if (!e.ctrlKey && !e.metaKey) {
        const delta = e.deltaY * -0.00075
        const newTargetZoom = Math.max(0.15, Math.min(1, targetZoomRef.current + delta))

        // Use cached rect instead of calling getBoundingClientRect() on every event
        const cursorX = e.clientX - cachedRect.left
        const cursorY = e.clientY - cachedRect.top

        // Get center of viewport
        const centerX = cachedRect.width / 2
        const centerY = cachedRect.height / 2

        // Calculate the point in world space that's currently under the cursor
        // We need to reverse the transform: point = (cursor - center - position) / zoom
        const [camX, camY, camZ] = targetPositionRef.current
        const currentZoom = targetZoomRef.current

        const worldX = (cursorX - centerX - camX) / currentZoom
        const worldY = (cursorY - centerY - camY) / currentZoom

        // After zooming, we want the same world point to be under the cursor
        // newPosition = cursor - center - (worldPoint * newZoom)
        targetPositionRef.current = [
          cursorX - centerX - worldX * newTargetZoom,
          cursorY - centerY - worldY * newTargetZoom,
          camZ
        ]

        const [trueCamX, trueCamY, trueCamZ] = trueTargetPositionRef.current
        const trueWorldX = (cursorX - centerX - trueCamX) / currentZoom
        const trueWorldY = (cursorY - centerY - trueCamY) / currentZoom
        trueTargetPositionRef.current = [
          cursorX - centerX - trueWorldX * newTargetZoom,
          cursorY - centerY - trueWorldY * newTargetZoom,
          trueCamZ
        ]

        targetZoomRef.current = newTargetZoom

        // Restart animation since target changed
        restartAnimationRef.current?.()
      }
    }

    // Prevent keyboard zoom shortcuts (Ctrl+Plus, Ctrl+Minus, Ctrl+0)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault()
      }
    }

    // Prevent pinch-to-zoom on touch devices
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault()
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    container.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      container.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('resize', updateCachedRect)
    }
  }, [])

  // Handle mouse move for panning (memoized to prevent recreation)
  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isPanningRef.current) return

    const deltaX = e.clientX - lastMousePosRef.current.x
    const deltaY = e.clientY - lastMousePosRef.current.y

    const [x, y, z] = targetPositionRef.current

    // Adjust pan speed based on zoom level (less zoom = faster pan)
    const panSpeed = Math.max(0.25, Math.min(1, 1 / targetZoomRef.current))

    targetPositionRef.current = [
      x + deltaX * panSpeed,
      y + deltaY * panSpeed,
      z
    ]

    const [trueX, trueY, trueZ] = trueTargetPositionRef.current
    trueTargetPositionRef.current = [
      trueX + deltaX * panSpeed,
      trueY + deltaY * panSpeed,
      trueZ
    ]

    lastMousePosRef.current = { x: e.clientX, y: e.clientY }

    // Restart animation since target changed
    restartAnimationRef.current?.()
  }, [])

  // Handle mouse up (memoized to prevent recreation)
  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab'
    }
  }, [])

  // Handle mouse down to start panning
  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // Left click only
      isPanningRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }

      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'
      }
    }
  }, [])

  // Set up mouse event listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // Store initial viewport height and FOV for dynamic FOV adjustment
  const initialViewportHeightRef = useRef(window.innerHeight)
  const baseFovRef = useRef(camera.getState().fov)

  // Handle window resize to recalculate 2D positions and adjust FOV for height changes
  useEffect(() => {
    const handleResize = () => {
      // Get current world position by reverse-calculating from 2D position
      const [currentX, currentY, currentZ] = currentPositionRef.current
      const [, , trueCurrentZ] = trueCurrentPositionRef.current
      const currentZoom = currentZoomRef.current

      // Get old viewport dimensions from the last calculation
      // We need to reverse the transformation to get the world position
      const oldViewportWidth = window.innerWidth
      const oldViewportHeight = window.innerHeight

      // Calculate old zoom offsets
      const oldZoomOffsetX = (oldViewportWidth / 2) - (oldViewportWidth * currentZoom / 2)
      const oldZoomOffsetY = (oldViewportHeight / 2) - (oldViewportHeight * currentZoom / 2)

      // Reverse calculate the camera position in world space
      // From: screenLeft = (cameraX * currentZoom) - zoomOffsetX
      // And: viewportCenterX = (screenLeft + screenRight) / 2 = (screenLeft + screenLeft + viewportWidth) / 2
      // Simplify: viewportCenterX = screenLeft + viewportWidth / 2
      // So: screenLeft = viewportCenterX - viewportWidth / 2 = currentX - viewportWidth / 2
      // Therefore: cameraX = (screenLeft + zoomOffsetX) / currentZoom

      const screenLeft = currentX - oldViewportWidth / 2
      const screenTop = currentY - oldViewportHeight / 2

      const cameraX = (screenLeft + oldZoomOffsetX) / currentZoom
      const cameraY = (screenTop + oldZoomOffsetY) / currentZoom

      // Now recalculate with new viewport dimensions
      const newViewportWidth = window.innerWidth
      const newViewportHeight = window.innerHeight

      const newZoomOffsetX = (newViewportWidth / 2) - (newViewportWidth * currentZoom / 2)
      const newZoomOffsetY = (newViewportHeight / 2) - (newViewportHeight * currentZoom / 2)

      const newScreenLeft = (cameraX * currentZoom) - newZoomOffsetX
      const newScreenTop = (cameraY * currentZoom) - newZoomOffsetY

      const newViewportCenterX = newScreenLeft + newViewportWidth / 2
      const newViewportCenterY = newScreenTop + newViewportHeight / 2

      // Update positions with new viewport dimensions
      const newPosition: [number, number, number] = [newViewportCenterX, newViewportCenterY, currentZ]

      // For true position, we can maintain it relative to the viewport center
      // The 3D scene should stay centered on the same world point
      const worldX = -cameraX
      const worldY = -cameraY
      const newTrueScreenLeft = worldX * currentZoom
      const newTrueScreenTop = worldY * currentZoom
      const newTruePosition: [number, number, number] = [-newTrueScreenLeft, -newTrueScreenTop, trueCurrentZ]

      // Adjust FOV to compensate for height changes
      // visibleHeight = 2 * tan(fov/2) * distance
      // To keep same visible height per pixel: newFov should make (visibleHeight / newHeight) = (baseVisibleHeight / baseHeight)
      // tan(newFov/2) / newHeight = tan(baseFov/2) / baseHeight
      // tan(newFov/2) = tan(baseFov/2) * (newHeight / baseHeight)
      const heightRatio = newViewportHeight / initialViewportHeightRef.current
      const baseFov = baseFovRef.current
      const newFov = 2 * Math.atan(Math.tan(baseFov / 2) * heightRatio)

      camera.setFov(newFov)

      // Update both current and target refs to prevent sudden jumps
      currentPositionRef.current = newPosition
      targetPositionRef.current = newPosition
      trueCurrentPositionRef.current = newTruePosition
      trueTargetPositionRef.current = newTruePosition

      // Update camera context
      camera.setPosition(newPosition)
      camera.setTruePosition(newTruePosition)

      // Update CSS transform immediately
      if (contentRef.current) {
        contentRef.current.style.transform = `translate(${newViewportCenterX}px, ${newViewportCenterY}px) scale(${currentZoom})`
      }

      console.log(`📐 CameraViewport: Resize handled - new viewport: ${newViewportWidth}x${newViewportHeight}, adjusted FOV: ${(newFov * 180 / Math.PI).toFixed(2)}°`)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [camera])

  // Trailing animation loop using ticker
  useEffect(() => {
    const trailingSpeed = 0.1 // Adjust for more/less smoothness (0.1 = slower, 0.3 = faster)
    const threshold = 0.01 // Stop animating when differences are below this threshold
    let lastTransform = '' // Cache last transform to avoid unnecessary DOM writes
    let isAnimating = false // Track whether animation is currently active

    const animate = (_timestamp: number, _deltaTime: number) => {
      // Skip trailing animation if custom animation is active
      if (isCustomAnimatingRef.current) {
        return
      }

      // Calculate differences
      const zoomDiff = Math.abs(targetZoomRef.current - currentZoomRef.current)
      const [targetX, targetY, targetZ] = targetPositionRef.current
      const [currentX, currentY, currentZ] = currentPositionRef.current
      const [trueCurrentX, trueCurrentY, trueCurrentZ] = trueCurrentPositionRef.current

      const positionDiff = Math.abs(targetX - currentX) + Math.abs(targetY - currentY)
      const truePositionDiff = Math.abs(trueTargetPositionRef.current[0] - trueCurrentX) +
                               Math.abs(trueTargetPositionRef.current[1] - trueCurrentY)

      // Check if animation is complete (all differences below threshold)
      if (zoomDiff < threshold && positionDiff < threshold && truePositionDiff < threshold) {
        // Snap to target values and stop
        currentZoomRef.current = targetZoomRef.current
        currentPositionRef.current = targetPositionRef.current
        trueCurrentPositionRef.current = trueTargetPositionRef.current

        // Update camera state one final time (batched for efficiency)
        camera.setState({
          zoom: currentZoomRef.current,
          position: currentPositionRef.current,
          truePosition: trueCurrentPositionRef.current
        })

        // Final transform update
        if (contentRef.current) {
          const [x, y] = currentPositionRef.current
          const newTransform = `translate(${x}px, ${y}px) scale(${currentZoomRef.current})`
          if (newTransform !== lastTransform) {
            contentRef.current.style.transform = newTransform
            lastTransform = newTransform
          }
        }

        // Stop animating - remove from ticker to save CPU
        if (isAnimating) {
          ticker.remove(animate)
          isAnimating = false
        }
      } else {
        // Continue interpolating
        currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * trailingSpeed

        currentPositionRef.current = [
          currentX + (targetX - currentX) * trailingSpeed,
          currentY + (targetY - currentY) * trailingSpeed,
          currentZ + (targetZ - currentZ) * trailingSpeed,
        ]

        trueCurrentPositionRef.current = [
          trueCurrentX + (trueTargetPositionRef.current[0] - trueCurrentX) * trailingSpeed,
          trueCurrentY + (trueTargetPositionRef.current[1] - trueCurrentY) * trailingSpeed,
          trueCurrentZ + (trueTargetPositionRef.current[2] - trueCurrentZ) * trailingSpeed,
        ]

        // Update camera state (batched for efficiency)
        camera.setState({
          zoom: currentZoomRef.current,
          position: currentPositionRef.current,
          truePosition: trueCurrentPositionRef.current
        })

        // Update CSS transform only if it changed
        if (contentRef.current) {
          const [x, y] = currentPositionRef.current
          const newTransform = `translate(${x}px, ${y}px) scale(${currentZoomRef.current})`
          if (newTransform !== lastTransform) {
            contentRef.current.style.transform = newTransform
            lastTransform = newTransform
          }
        }
      }
    }

    // Function to start animation when target changes
    const startAnimation = () => {
      if (!isAnimating) {
        ticker.add(animate)
        isAnimating = true
      }
    }

    // Expose restart function to other handlers
    restartAnimationRef.current = startAnimation

    // Initially start the animation
    startAnimation()

    return () => {
      ticker.remove(animate)
      isAnimating = false
      restartAnimationRef.current = null
    }
  }, [camera])

  return (
    <div
      ref={containerRef}
      className="camera-viewport"
      onMouseDown={handleMouseDown}
    >
      {/* R3F Canvas - renders 3D objects */}
      <R3FCanvas>
        <Suspense fallback={null}>
          {/* Render all 3D objects in sorted order */}
          {sortedObjects.map(({ id, component }) => (
            <group key={id}>
              {component}
            </group>
          ))}
        </Suspense>
      </R3FCanvas>

      <div
        ref={contentRef}
        className="camera-content"
      >
        {children}
      </div>
    </div>
  )
})

CameraViewport.displayName = 'CameraViewport'
