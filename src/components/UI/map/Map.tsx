import { type RefObject, useState, useRef, useEffect } from 'react'
import { ISLAND_REGISTRY } from '../../../config/islandRegistry'
import type { CameraViewportHandle } from '../../canvas/CameraViewport'
import './Map.scss'

interface MapProps {
  cameraViewportRef: RefObject<CameraViewportHandle | null>
  isVisible?: boolean
}

export function Map({ cameraViewportRef, isVisible = false }: MapProps) {
  const [position, setPosition] = useState({ x: 20, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 })

  const handleIslandClick = (islandId: string) => {
    const island = ISLAND_REGISTRY[islandId]

    if (island && cameraViewportRef.current) {
      const [islandX, islandY, islandZ] = island.position

      console.log(`🗺️ Map: Navigating to island "${islandId}" at [${islandX}, ${islandY}, ${islandZ}]`)

      // Use the simplified moveToIsland function
      // It handles all coordinate transformations, distance calculation, and duration scaling
      cameraViewportRef.current.moveToIsland(islandX, islandY, islandZ, {
        animated: true,
        easing: 'easeOutQuart'
      })
    } else {
      console.error(`🗺️ Map: Failed to navigate - island or ref missing`, { island, ref: cameraViewportRef.current })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start drag if clicking on the header
    if (!(e.target as HTMLElement).closest('.map-header')) return

    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return

    const deltaX = e.clientX - dragRef.current.startX
    const deltaY = e.clientY - dragRef.current.startY

    setPosition({
      x: dragRef.current.initialX + deltaX,
      y: dragRef.current.initialY + deltaY
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Add and remove event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging])

  return (
    <div
      className={`map-container ${isVisible ? 'visible' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`
      }}
    >
      <div className="map-inner">
        <div
          className="map-header"
          onMouseDown={handleMouseDown}
        >
          <h3>Map</h3>
        </div>
        <div className="map-islands">
          {Object.entries(ISLAND_REGISTRY).map(([id, config]) => (
            <button
              key={id}
              className="map-island-button"
              onClick={() => handleIslandClick(id)}
              title={`Navigate to ${config.name}`}
            >
              <span className="island-name">{config.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
