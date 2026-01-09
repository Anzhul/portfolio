import { type RefObject, useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ISLAND_REGISTRY } from '../../../config/islandRegistry'
import type { CameraViewportHandle } from '../../canvas/CameraViewport'
import './Map.scss'

interface MapProps {
  cameraViewportRef: RefObject<CameraViewportHandle | null>
  isVisible?: boolean
}

export function Map({ cameraViewportRef, isVisible = false }: MapProps) {
  const location = useLocation()
  const [position, setPosition] = useState({ x: 20, y: 80 })
  const [isDragging, setIsDragging] = useState(false)
  const [clickedIsland, setClickedIsland] = useState<string | null>(null)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 })

  // Derive active island from current route (global context)
  const routeBasedIsland = location.pathname.startsWith('/') ? location.pathname.slice(1) : null

  // Double-tier system: prefer clicked island, fall back to route-based island
  const activeIsland = clickedIsland || routeBasedIsland

  // Reset clicked island when route changes (fall back to global context)
  useEffect(() => {
    setClickedIsland(null)
  }, [location.pathname])

  const handleIslandClick = (islandId: string) => {
    const island = ISLAND_REGISTRY[islandId]

    if (island && cameraViewportRef.current) {
      const [islandX, islandY, islandZ] = island.position

      console.log(`🗺️ Map: Navigating to island "${islandId}" at [${islandX}, ${islandY}, ${islandZ}]`)

      // Set clicked island immediately for instant feedback
      setClickedIsland(islandId)

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
      <div className={`map-inner ${isVisible ? 'visible' : ''} ${isDragging ? 'dragging' : ''}`}>
          {Array.from(new Set(Object.values(ISLAND_REGISTRY).map(item => item.subGroup))).filter((subGroup): subGroup is string => subGroup !== undefined).map(subGroup => (
            <div key={subGroup} className={`map-subGroup map-${subGroup} ${isVisible ? 'visible' : ''}`}>
              <h3>{subGroup.charAt(0).toUpperCase() + subGroup.slice(1)}</h3>
              <div className="map-islands-wrapper">
                {Object.entries(ISLAND_REGISTRY).filter(([_, config]) => config.subGroup === subGroup).map(([id, config]) => (
                  <div key={id} className="map-island-item">
                    <div className={`map-active-indicator ${activeIsland === id ? 'active' : ''}`} />
                    <button
                    className={`map-island-button ${activeIsland === id ? 'active' : ''}`}
                    onClick={() => handleIslandClick(id)}
                    title={`Navigate to ${config.name}`}
                    >
                      <span className="island-name">{config.name}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
