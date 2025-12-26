import { type RefObject } from 'react'
import { ISLAND_REGISTRY } from '../../../config/islandRegistry'
import type { CameraViewportHandle } from '../../canvas/CameraViewport'
import { useCamera } from '../../../context/CameraContext'
import './Map.scss'

interface MapProps {
  cameraViewportRef: RefObject<CameraViewportHandle | null>
}

export function Map({ cameraViewportRef }: MapProps) {
  const camera = useCamera()

  const handleIslandClick = (islandId: string) => {
    const island = ISLAND_REGISTRY[islandId]

    if (island && cameraViewportRef.current) {
      const [islandX, islandY, islandZ] = island.position

      // Get current zoom level
      const currentZoom = camera.getState().zoom

      // Get viewport dimensions
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      // To center an island at position [x, y] in the viewport:
      // Account for zoom: scaled viewport center = (viewport center) / zoom
      // Camera position = -(island position) + (scaled viewport center)
      const cameraX = -islandX + (viewportWidth / 2) / currentZoom
      const cameraY = -islandY + (viewportHeight / 2) / currentZoom

      console.log(`🗺️ Map: Navigating to island "${islandId}"`)
      console.log(`🗺️ Map: Island position: [${islandX}, ${islandY}, ${islandZ}]`)
      console.log(`🗺️ Map: Current zoom: ${currentZoom}`)
      console.log(`🗺️ Map: Viewport: [${viewportWidth}, ${viewportHeight}]`)
      console.log(`🗺️ Map: Camera position: [${cameraX}, ${cameraY}, ${islandZ}]`)

      // Smooth transition to island (keep current zoom)
      cameraViewportRef.current.moveTo(cameraX, cameraY, islandZ, undefined, true)
    } else {
      console.error(`🗺️ Map: Failed to navigate - island or ref missing`, { island, ref: cameraViewportRef.current })
    }
  }

  return (
    <div className="map-container">
      <div className="map-header">
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
            <span className="island-icon">Island</span>
            <span className="island-name">{config.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
