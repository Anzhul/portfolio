import { useRef, useEffect, useMemo, type ReactNode, type MouseEvent } from 'react'
import { useCamera } from '../../context/CameraContext'
import { useScene } from '../../context/SceneContext'
import { ticker } from '../../utils/AnimationTicker'
import R3FCanvas from './R3FCanvas'
import './CameraViewport.scss'

interface CameraViewportProps {
  children?: ReactNode
}

export function CameraViewport({ children }: CameraViewportProps) {
  const camera = useCamera()
  const { objects } = useScene()
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const isPanningRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })

  // Target values for trailing
  const targetZoomRef = useRef(1)
  const targetPositionRef = useRef<[number, number, number]>([0, 0, 5])

  // Current interpolated values
  const currentZoomRef = useRef(1)
  const currentPositionRef = useRef<[number, number, number]>([0, 0, 5])

  // Sort objects by zIndex for proper render order
  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
    [objects]
  )

  // Handle mouse wheel for custom zooming - prevent browser zoom but keep our scroll zoom
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault() // Always prevent default to block browser zoom

      // Only apply custom zoom if NOT a browser zoom gesture (Ctrl/Cmd not pressed)
      if (!e.ctrlKey && !e.metaKey) {
        const delta = e.deltaY * -0.00075
        const newTargetZoom = Math.max(0.1, Math.min(2, targetZoomRef.current + delta))

        // Calculate cursor position relative to the container
        const rect = container.getBoundingClientRect()
        const cursorX = e.clientX - rect.left
        const cursorY = e.clientY - rect.top

        // Get center of viewport
        const centerX = rect.width / 2
        const centerY = rect.height / 2

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

        targetZoomRef.current = newTargetZoom
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
      container.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      container.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  // Handle mouse down to start panning
  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button === 0) { // Left click only
      isPanningRef.current = true
      lastMousePosRef.current = { x: e.clientX, y: e.clientY }

      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing'
      }
    }
  }

  // Handle mouse move for panning
  useEffect(() => {
    const handleMouseMove = (e: globalThis.MouseEvent) => {
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

      lastMousePosRef.current = { x: e.clientX, y: e.clientY }
    }

    const handleMouseUp = () => {
      isPanningRef.current = false
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab'
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  // Trailing animation loop using ticker
  useEffect(() => {
    const trailingSpeed = 0.12 // Adjust for more/less smoothness (0.1 = slower, 0.3 = faster)

    const animate = (_timestamp: number, _deltaTime: number) => {
      // Interpolate zoom
      currentZoomRef.current += (targetZoomRef.current - currentZoomRef.current) * trailingSpeed

      // Interpolate position
      const [targetX, targetY, targetZ] = targetPositionRef.current
      const [currentX, currentY, currentZ] = currentPositionRef.current

      currentPositionRef.current = [
        currentX + (targetX - currentX) * trailingSpeed,
        currentY + (targetY - currentY) * trailingSpeed,
        currentZ + (targetZ - currentZ) * trailingSpeed,
      ]


      // Update camera state

      camera.setZoom(currentZoomRef.current)
      camera.setPosition(currentPositionRef.current)

      // Update CSS transform
      if (contentRef.current) {
        const [x, y] = currentPositionRef.current
        contentRef.current.style.transform = `translate(${x}px, ${y}px) scale(${currentZoomRef.current})`
      }
    }

    // Add to ticker
    ticker.add(animate)

    return () => {
      ticker.remove(animate)
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
        {/* Render all 3D objects in sorted order */}
        {sortedObjects.map(({ id, component }) => (
          <group key={id}>
            {component}
          </group>
        ))}
      </R3FCanvas>

      <div
        ref={contentRef}
        className="camera-content"
      >
        {children}
      </div>
    </div>
  )
}
