import { useRef, useEffect, useState, useMemo } from 'react'
import { loadingManager } from '../../utils/SimpleLoadingManager'
import { CameraProvider } from '../../context/CameraContext'
import { WorldProvider } from '../../context/WorldContext'
import { BoundaryProvider } from '../../context/BoundaryContext'
import { World } from '../../components/world/World'
import { SceneProvider } from '../../context/SceneContext'
import { CameraViewport, type CameraViewportHandle } from '../../components/canvas/CameraViewport'
import { IslandLoader } from '../../components/loading/IslandLoader'
import { ISLAND_REGISTRY } from '../../config/islandRegistry'
import { SECTION_REGISTRY } from '../../config/sectionRegistry'
import { RouteSync } from '../../components/routing/RouteSync'
import { Map } from '../../components/UI/map/Map'
import { useToolbar } from '../../context/ToolbarContext'

interface NavigationTarget {
  id: string
  position: [number, number, number]
  name: string
}

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
  const currentIndexRef = useRef(0)
  const { setToolbarHandlers } = useToolbar()

  // Build ordered list of all navigable targets (islands + sections)
  const navigationTargets = useMemo<NavigationTarget[]>(() => {
    const targets: NavigationTarget[] = []

    for (const island of Object.values(ISLAND_REGISTRY)) {
      targets.push({
        id: island.id,
        position: island.position,
        name: island.name,
      })
    }

    for (const section of Object.values(SECTION_REGISTRY)) {
      const parentIsland = ISLAND_REGISTRY[section.islandId]
      const pos: [number, number, number] =
        section.positionMode === 'relative' && parentIsland
          ? [
              parentIsland.position[0] + section.position[0],
              parentIsland.position[1] + section.position[1],
              parentIsland.position[2] + section.position[2],
            ]
          : section.position
      targets.push({
        id: section.id,
        position: pos,
        name: section.name,
      })
    }

    return targets
  }, [])

  const navigateToIndex = (index: number) => {
    const target = navigationTargets[index]
    if (!target || !cameraViewportRef.current) return
    currentIndexRef.current = index
    cameraViewportRef.current.moveToIsland(
      target.position[0],
      target.position[1],
      target.position[2],
      { animated: true, easing: 'easeOutQuart' }
    )
  }

  const handleNavigatePrev = () => {
    const prevIndex =
      currentIndexRef.current <= 0
        ? navigationTargets.length - 1
        : currentIndexRef.current - 1
    navigateToIndex(prevIndex)
  }

  const handleNavigateNext = () => {
    const nextIndex =
      currentIndexRef.current >= navigationTargets.length - 1
        ? 0
        : currentIndexRef.current + 1
    navigateToIndex(nextIndex)
  }

  const handleToggleMap = () => {
    setIsMapVisible(!isMapVisible)
  }

  // Register toolbar handlers when visible, clear when hidden
  useEffect(() => {
    if (isVisible) {
      setToolbarHandlers({
        onNavigatePrev: handleNavigatePrev,
        onNavigateNext: handleNavigateNext,
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
  }, [isMapVisible, isVisible, navigationTargets])

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
