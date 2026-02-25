import { useRef, useEffect, useCallback, useImperativeHandle, forwardRef, type ReactNode, type MouseEvent } from 'react'
import { useCamera } from '../../context/CameraContext'
import { useViewport } from '../../context/ViewportContext'
import { ticker } from '../../utils/AnimationTicker'
import { Animation, Easing, type EasingFunction } from '../../utils/Animation'
import { Spring } from '../../utils/Spring'
import { WorldCanvas } from './WorldCanvas'
import { worldRenderer } from '../../renderer/WorldRenderer'
import './CameraViewport.scss'

// ── Projection helpers ──

/** Derive CSS translate values from world position */
function worldToCSS(
  wx: number, wy: number,
  zoom: number, vw: number, vh: number
): [number, number] {
  return [
    zoom * (vw / 2 - wx),
    zoom * (vh / 2 - wy),
  ]
}

/** Derive WebGL "true" position from world position (for worldRenderer) */
function worldToWebGL(wx: number, wy: number, zoom: number): [number, number] {
  return [-wx * zoom, -wy * zoom]
}

/** Convert a screen point to world coordinates */
function screenToWorld(
  screenX: number, screenY: number,
  worldPosX: number, worldPosY: number,
  zoom: number, vw: number, vh: number
): [number, number] {
  return [
    worldPosX + (screenX - vw / 2) / zoom,
    worldPosY + (screenY - vh / 2) / zoom,
  ]
}

// ── Component ──

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
  const { isMobileOnly } = useViewport()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })
  const activeAnimationRef = useRef<Animation<any> | null>(null)
  const isCustomAnimatingRef = useRef(false)
  const restartAnimationRef = useRef<(() => void) | null>(null)

  // Touch interaction state
  const isTouchPanningRef = useRef(false)
  const isPinchingRef = useRef(false)
  const lastTouchPosRef = useRef({ x: 0, y: 0 })
  const pinchStartDistRef = useRef(0)
  const pinchStartZoomRef = useRef(0)

  // Zoom anchor: when set, position is derived from zoom to keep this world point
  // fixed at the given screen position (cursor-anchored zoom).
  // Cleared when zoom settles or user starts panning.
  const zoomAnchorRef = useRef<{
    worldX: number; worldY: number
    screenX: number; screenY: number
  } | null>(null)

  // Spring-based animation state (replaces target/current refs + trailing lerp)
  const initialZoom = isMobileOnly ? 0.3 : 0.45
  const springsRef = useRef<null | { x: Spring; y: Spring; z: Spring; zoom: Spring }>(null)
  if (!springsRef.current) {
    springsRef.current = {
      x: new Spring({ initial: 0, stiffness: 6.5, animationTime: 1.25 }),
      y: new Spring({ initial: 0, stiffness: 6.5, animationTime: 1.25 }),
      z: new Spring({ initial: 5, stiffness: 6.5, animationTime: 1.25 }),
      zoom: new Spring({ initial: initialZoom, stiffness: 6.5, animationTime: 1.25, exponential: true }),
    }
  }

  /** Apply current world position + zoom to all outputs (CSS, WebGL, context) */
  const applyState = (wx: number, wy: number, wz: number, zoom: number) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const [cssX, cssY] = worldToCSS(wx, wy, zoom, vw, vh)
    const [trueX, trueY] = worldToWebGL(wx, wy, zoom)

    camera.setState({ worldPosition: [wx, wy, wz], zoom })
    worldRenderer.updateCamera(trueX, trueY, zoom, camera.getState().fov, vw, vh)

    // Defer CSS to next macrotask so it paints in the same vsync as the
    // worker's WebGL render (which processes the camera message between frames).
    const transform = `translate(${cssX}px, ${cssY}px) scale(${zoom})`
    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.style.transform = transform
      }
    }, 0)
  }

  /**
   * Low-level camera movement in world coordinates.
   */
  const moveToRaw = (
    worldX: number,
    worldY: number,
    z: number = 0,
    zoom?: number,
    smooth: boolean = false,
  ) => {
    const springs = springsRef.current!
    const targetZoom = zoom ?? springs.zoom.value

    if (smooth) {
      springs.x.springTo(worldX)
      springs.y.springTo(worldY)
      springs.z.springTo(z)
      springs.zoom.springTo(targetZoom)
      restartAnimationRef.current?.()
    } else {
      springs.x.resetTo(worldX)
      springs.y.resetTo(worldY)
      springs.z.resetTo(z)
      springs.zoom.resetTo(targetZoom)
      applyState(worldX, worldY, z, targetZoom)
    }
  }

  /**
   * Center-anchored zoom adjustment.
   * World position doesn't change — just the zoom level.
   */
  const adjustZoom = (delta: number) => {
    const springs = springsRef.current!
    const newZoom = Math.max(0.15, Math.min(1.5, springs.zoom.target + delta))
    springs.zoom.springTo(newZoom)
    restartAnimationRef.current?.()
  }

  const zoomIn = () => adjustZoom(0.15)
  const zoomOut = () => adjustZoom(-0.15)

  /**
   * Custom camera animation with precise duration and easing.
   */
  const moveToCustom = (
    targetX: number,
    targetY: number,
    targetZ: number = 0,
    zoom?: number,
    duration: number = 700,
    easing: EasingFunction | keyof typeof Easing = 'easeOutExpo'
  ) => {
    if (activeAnimationRef.current) {
      activeAnimationRef.current.stop()
      activeAnimationRef.current = null
    }

    const easingFn = typeof easing === 'function' ? easing : Easing[easing]
    const springs = springsRef.current!

    // Snap springs to current position to prevent interference
    springs.x.resetTo(springs.x.value)
    springs.y.resetTo(springs.y.value)
    springs.z.resetTo(springs.z.value)
    springs.zoom.resetTo(springs.zoom.value)

    const startX = springs.x.value
    const startY = springs.y.value
    const startZ = springs.z.value
    const startZoom = springs.zoom.value
    const targetZoom = zoom ?? startZoom

    isCustomAnimatingRef.current = true

    const animation = new Animation({
      from: { x: startX, y: startY, z: startZ, zoom: startZoom },
      to: { x: targetX, y: targetY, z: targetZ, zoom: targetZoom },
      duration,
      easing: easingFn,
      onUpdate: (v) => {
        springs.x.resetTo(v.x)
        springs.y.resetTo(v.y)
        springs.z.resetTo(v.z)
        springs.zoom.resetTo(v.zoom)
        applyState(v.x, v.y, v.z, v.zoom)
      },
      onComplete: () => {
        springs.x.resetTo(targetX)
        springs.y.resetTo(targetY)
        springs.z.resetTo(targetZ)
        springs.zoom.resetTo(targetZoom)
        applyState(targetX, targetY, targetZ, targetZoom)

        activeAnimationRef.current = null
        requestAnimationFrame(() => {
          isCustomAnimatingRef.current = false
        })
      }
    })

    activeAnimationRef.current = animation
    animation.start()
  }

  /**
   * Navigate camera to center on a world position.
   * moveToIsland and moveTo share this implementation since both
   * take world coordinates directly.
   */
  const navigateTo = (
    worldX: number,
    worldY: number,
    worldZ: number = 0,
    options: {
      animated?: boolean
      duration?: number
      easing?: EasingFunction | keyof typeof Easing
      zoom?: number
    } = {}
  ) => {
    const { animated = true, duration, easing = 'easeOutQuart', zoom } = options
    const currentZoom = zoom ?? camera.getState().zoom

    if (!animated) {
      moveToRaw(worldX, worldY, worldZ, currentZoom, false)
      return
    }

    // Calculate distance in screen pixels for auto-duration
    const springs = springsRef.current!
    const deltaX = worldX - springs.x.value
    const deltaY = worldY - springs.y.value
    const worldDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    const screenDistance = worldDistance * currentZoom

    if (screenDistance < 1) return

    let finalDuration = duration
    if (!finalDuration) {
      const minDuration = 800
      const maxDuration = 3000
      const durationPerPixel = 0.3
      finalDuration = Math.min(Math.max(minDuration + screenDistance * durationPerPixel, minDuration), maxDuration)
    }

    moveToCustom(worldX, worldY, worldZ, currentZoom, finalDuration, easing)
  }

  const moveToIsland = (
    islandX: number, islandY: number, islandZ: number = 0,
    options: { animated?: boolean, duration?: number, easing?: EasingFunction | keyof typeof Easing, zoom?: number } = {}
  ) => navigateTo(islandX, islandY, islandZ, options)

  const moveTo = (
    x: number, y: number, z: number = 0,
    options: { animated?: boolean, duration?: number, easing?: EasingFunction | keyof typeof Easing, zoom?: number } = {}
  ) => navigateTo(x, y, z, options)

  useImperativeHandle(ref, () => ({ moveTo, moveToIsland, zoomIn, zoomOut }))

  // ── Input handlers ──

  // Wheel zoom + keyboard shortcuts + touch gestures
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const springs = springsRef.current!

    let cachedRect = container.getBoundingClientRect()

    let resizeTimeout: number | null = null
    const updateCachedRect = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      resizeTimeout = window.setTimeout(() => {
        if (container) cachedRect = container.getBoundingClientRect()
      }, 100)
    }
    window.addEventListener('resize', updateCachedRect)

    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault()

      if (!e.ctrlKey && !e.metaKey) {
        const delta = e.deltaY * -0.00075
        const currentZoom = springs.zoom.value
        const newZoom = Math.max(0.15, Math.min(1.5, springs.zoom.target + delta))

        // Cursor position relative to container
        const cursorX = e.clientX - cachedRect.left
        const cursorY = e.clientY - cachedRect.top
        const vw = cachedRect.width
        const vh = cachedRect.height

        // Anchor: keep world point under cursor fixed as zoom changes.
        // Use current visual state (.value) not target — target may be stale
        // during consecutive scrolls since position is derived, not sprung.
        const [cursorWorldX, cursorWorldY] = screenToWorld(
          cursorX, cursorY, springs.x.value, springs.y.value, currentZoom, vw, vh
        )
        zoomAnchorRef.current = {
          worldX: cursorWorldX, worldY: cursorWorldY,
          screenX: cursorX, screenY: cursorY,
        }
        springs.zoom.springTo(newZoom)

        restartAnimationRef.current?.()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault()
      }
    }

    // ── Touch handlers ──

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isTouchPanningRef.current = true
        isPinchingRef.current = false
        lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      } else if (e.touches.length === 2) {
        e.preventDefault()
        isTouchPanningRef.current = false
        isPinchingRef.current = true

        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        pinchStartDistRef.current = Math.sqrt(dx * dx + dy * dy)
        pinchStartZoomRef.current = springs.zoom.target

        lastTouchPosRef.current = {
          x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
          y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && isTouchPanningRef.current && !isPinchingRef.current) {
        // Single-finger pan
        e.preventDefault()
        const touch = e.touches[0]
        const deltaX = touch.clientX - lastTouchPosRef.current.x
        const deltaY = touch.clientY - lastTouchPosRef.current.y

        const zoom = springs.zoom.target
        const panSpeed = 1.8 / zoom

        // Pan cancels any active zoom anchor
        zoomAnchorRef.current = null

        // Screen delta → world delta (negate: drag right = look left)
        springs.x.springTo(springs.x.target - deltaX * panSpeed / zoom)
        springs.y.springTo(springs.y.target - deltaY * panSpeed / zoom)

        lastTouchPosRef.current = { x: touch.clientX, y: touch.clientY }
        restartAnimationRef.current?.()
      } else if (e.touches.length === 2) {
        // Pinch-to-zoom + pan: compute position directly instead of using zoom anchor.
        // Anchor approach drifts for pinch because both midpoint and zoom move simultaneously.
        e.preventDefault()
        isPinchingRef.current = true
        isTouchPanningRef.current = false

        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const currentDist = Math.sqrt(dx * dx + dy * dy)
        const scale = currentDist / pinchStartDistRef.current
        const newZoom = Math.max(0.15, Math.min(1.5, pinchStartZoomRef.current * scale))

        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2

        const vw = cachedRect.width
        const vh = cachedRect.height
        const oldMidLocalX = lastTouchPosRef.current.x - cachedRect.left
        const oldMidLocalY = lastTouchPosRef.current.y - cachedRect.top
        const newMidLocalX = midX - cachedRect.left
        const newMidLocalY = midY - cachedRect.top

        const oldZoom = springs.zoom.value

        // World point under old finger midpoint at current zoom
        const [anchorWorldX, anchorWorldY] = screenToWorld(
          oldMidLocalX, oldMidLocalY, springs.x.value, springs.y.value, oldZoom, vw, vh
        )

        // Derive new camera position: keep that world point under the new midpoint at new zoom
        const newWorldX = anchorWorldX - (newMidLocalX - vw / 2) / newZoom
        const newWorldY = anchorWorldY - (newMidLocalY - vh / 2) / newZoom

        // Position is set directly (pinch provides smooth input).
        // Zoom uses springTo for a slight ease/resistance feel.
        zoomAnchorRef.current = null
        springs.x.resetTo(newWorldX)
        springs.y.resetTo(newWorldY)
        springs.zoom.springTo(newZoom)

        lastTouchPosRef.current = { x: midX, y: midY }
        restartAnimationRef.current?.()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        isTouchPanningRef.current = false
        isPinchingRef.current = false
      } else if (e.touches.length === 1) {
        isPinchingRef.current = false
        isTouchPanningRef.current = true
        lastTouchPosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }
      }
    }

    container.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)

    return () => {
      if (resizeTimeout) clearTimeout(resizeTimeout)
      container.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('resize', updateCachedRect)
    }
  }, [])

  // Mouse pan
  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (!isPanningRef.current) return

    const deltaX = e.clientX - lastMousePosRef.current.x
    const deltaY = e.clientY - lastMousePosRef.current.y

    const springs = springsRef.current!
    const zoom = springs.zoom.target
    const panSpeed = Math.max(0.25, Math.min(1, 1 / zoom))

    // Pan cancels any active zoom anchor
    zoomAnchorRef.current = null

    springs.x.springTo(springs.x.target - deltaX * panSpeed / zoom)
    springs.y.springTo(springs.y.target - deltaY * panSpeed / zoom)

    lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    restartAnimationRef.current?.()
  }, [])

  const handleMouseUp = useCallback(() => {
    isPanningRef.current = false
    if (containerRef.current) containerRef.current.style.cursor = 'grab'
  }, [])

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) {
      isPanningRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
      if (containerRef.current) containerRef.current.style.cursor = 'grabbing'
    }
  }, [])

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // ── Resize handler ──

  const initialViewportHeightRef = useRef(window.innerHeight)
  const baseFovRef = useRef(camera.getState().fov)

  useEffect(() => {
    const handleResize = () => {
      const springs = springsRef.current!
      const currentZoom = springs.zoom.value
      const newVW = window.innerWidth
      const newVH = window.innerHeight

      // World position doesn't change — we're still looking at the same point
      // Just re-derive CSS transform with new viewport dimensions
      const wx = springs.x.value
      const wy = springs.y.value
      const [cssX, cssY] = worldToCSS(wx, wy, currentZoom, newVW, newVH)

      // Adjust FOV to compensate for height changes
      const heightRatio = newVH / initialViewportHeightRef.current
      const baseFov = baseFovRef.current
      const newFov = 2 * Math.atan(Math.tan(baseFov / 2) * heightRatio)
      camera.setFov(newFov)

      // Update WebGL worker renderer with new viewport
      worldRenderer.resize(newVW, newVH, window.devicePixelRatio || 1)

      // Update WebGL camera
      const [trueX, trueY] = worldToWebGL(wx, wy, currentZoom)
      worldRenderer.updateCamera(trueX, trueY, currentZoom, newFov, newVW, newVH)

      // Defer CSS to next macrotask to stay in sync with WebGL worker
      const transform = `translate(${cssX}px, ${cssY}px) scale(${currentZoom})`
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.style.transform = transform
        }
      }, 0)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [camera])

  // ── Spring animation loop ──

  useEffect(() => {
    const springs = springsRef.current!
    let lastTransform = ''
    let isAnimating = false

    const animate = (_timestamp: number, _deltaTime: number) => {
      if (isCustomAnimatingRef.current) return

      const anchor = zoomAnchorRef.current
      const vw = window.innerWidth
      const vh = window.innerHeight

      // Advance zoom spring (always)
      const zoomAnim = springs.zoom.update()
      const zAnim = springs.z.update()
      const zoom = springs.zoom.value

      let wx: number, wy: number
      let posAnimating: boolean

      if (anchor) {
        // Cursor-anchored zoom: derive position from zoom so the anchor
        // world point stays fixed at the cursor screen position.
        wx = anchor.worldX - (anchor.screenX - vw / 2) / zoom
        wy = anchor.worldY - (anchor.screenY - vh / 2) / zoom

        // Keep position springs in sync (so they're correct when anchor clears)
        springs.x.resetTo(wx)
        springs.y.resetTo(wy)

        posAnimating = zoomAnim // position is coupled to zoom
        if (!zoomAnim) zoomAnchorRef.current = null // anchor done
      } else {
        // Normal: position springs animate independently
        const xAnim = springs.x.update()
        const yAnim = springs.y.update()
        posAnimating = xAnim || yAnim
        wx = springs.x.value
        wy = springs.y.value
      }

      const wz = springs.z.value
      const stillAnimating = posAnimating || zoomAnim || zAnim

      const [cssX, cssY] = worldToCSS(wx, wy, zoom, vw, vh)
      const [trueX, trueY] = worldToWebGL(wx, wy, zoom)

      camera.setState({ worldPosition: [wx, wy, wz], zoom })
      worldRenderer.updateCamera(trueX, trueY, zoom, camera.getState().fov, vw, vh)

      // Defer CSS to next macrotask so it paints in the same vsync as the
      // worker's WebGL render (which processes the camera message between frames).
      const newTransform = `translate(${cssX}px, ${cssY}px) scale(${zoom})`
      if (newTransform !== lastTransform) {
        lastTransform = newTransform
        setTimeout(() => {
          if (contentRef.current) {
            contentRef.current.style.transform = newTransform
          }
        }, 0)
      }

      // Remove from ticker when all springs are at rest
      if (!stillAnimating && isAnimating) {
        ticker.remove(animate)
        isAnimating = false
      }
    }

    const startAnimation = () => {
      if (!isAnimating) {
        ticker.add(animate)
        isAnimating = true
      }
    }

    restartAnimationRef.current = startAnimation
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
      <WorldCanvas />

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
