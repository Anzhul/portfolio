import { useRef, useEffect, useState } from 'react'
import { loadingManager } from '../../utils/SimpleLoadingManager'
import { CameraProvider } from '../../context/CameraContext'
import { WorldProvider } from '../../context/WorldContext'
import { BoundaryProvider } from '../../context/BoundaryContext'
import { World } from '../../components/world/World'
import { SceneProvider } from '../../context/SceneContext'
import { CameraViewport, type CameraViewportHandle } from '../../components/canvas/CameraViewport'
import { IslandLoader } from '../../components/loading/IslandLoader'
import { ISLAND_REGISTRY } from '../../config/islandRegistry'
import { RouteSync } from '../../components/routing/RouteSync'
import { Map } from '../../components/UI/map/Map'
import { useToolbar } from '../../context/ToolbarContext'

interface Experience3DContentProps {
  cameraViewportRef: React.RefObject<CameraViewportHandle | null>
  isMapVisible: boolean
  isVisible: boolean
}

function Experience3DContent({ cameraViewportRef, isMapVisible, isVisible }: Experience3DContentProps) {
  // Mark app as loaded after initial render
  useEffect(() => {
    loadingManager.markAppLoaded()
  }, [])

  return (
    <div style={{ display: isVisible ? 'block' : 'none' }}>
      {/* Route synchronization - updates URL based on viewport position */}
      <RouteSync cameraViewportRef={cameraViewportRef} isActive={isVisible} />

      {/* Map overlay */}
      <Map cameraViewportRef={cameraViewportRef} isVisible={isMapVisible} />

      {/* Camera viewport wraps world for pan/zoom control */}
      <CameraViewport ref={cameraViewportRef}>
        {/* World with 2D content */}
        <World dimensions={[10000, 10000]}>
          {/* Dynamically loaded islands */}
          {Object.values(ISLAND_REGISTRY).map((config) => (
            <IslandLoader key={config.id} config={config} />
          ))}
        </World>
      </CameraViewport>
    </div>
  )
}

interface Experience3DProps {
  isVisible: boolean
}

export function Experience3D({ isVisible }: Experience3DProps) {
  const cameraViewportRef = useRef<CameraViewportHandle>(null)
  const [isMapVisible, setIsMapVisible] = useState(false)
  const { setToolbarHandlers } = useToolbar()

  const handleZoomIn = () => {
    if (cameraViewportRef.current) {
      cameraViewportRef.current.zoomIn()
    }
  }

  const handleZoomOut = () => {
    if (cameraViewportRef.current) {
      cameraViewportRef.current.zoomOut()
    }
  }

  const handleToggleMap = () => {
    setIsMapVisible(!isMapVisible)
  }

  // Register toolbar handlers when visible, clear when hidden
  useEffect(() => {
    if (isVisible) {
      setToolbarHandlers({
        onZoomIn: handleZoomIn,
        onZoomOut: handleZoomOut,
        onToggleMap: handleToggleMap,
        isMapVisible
      })
    } else {
      setToolbarHandlers({})
    }

    // Cleanup: clear handlers when component unmounts
    return () => {
      setToolbarHandlers({})
    }
  }, [isMapVisible, isVisible])

  return (
    <WorldProvider>
      <SceneProvider>
        <CameraProvider>
          <BoundaryProvider>
            {/* All 3D routes render the same content - RouteSync handles URL updates based on position */}
            <Experience3DContent
              cameraViewportRef={cameraViewportRef}
              isMapVisible={isMapVisible}
              isVisible={isVisible}
            />
          </BoundaryProvider>
        </CameraProvider>
      </SceneProvider>
    </WorldProvider>
  )
}
