import { Suspense, useEffect, useState } from 'react'
import { useBoundary, useBoundaryState } from '../../context/BoundaryContext'
import type { IslandConfig } from '../../config/islandRegistry'
import { shouldShowSkeleton } from '../../utils/devMode'
import { useSimpleLoading } from '../../hooks/useSimpleLoading'

export interface IslandLoaderProps {
  config: IslandConfig
}

/**
 * Handles lazy loading of island components with Suspense boundaries
 *
 * Loading strategy:
 * 1. Immediately register island metadata with BoundaryManager
 * 2. Show skeleton while island is outside load radius
 * 3. Preload island component at 2x loadRadius (in background)
 * 4. Show Suspense skeleton when entering loadRadius (if not yet loaded)
 * 5. Render actual island component once loaded
 * 6. Keep island mounted even when outside boundaries (as per requirements)
 *
 * Dev Mode:
 * - Add ?skeleton=true to URL to show all skeletons
 * - Add ?skeleton=home,projects to show specific island skeletons
 */
export function IslandLoader({ config }: IslandLoaderProps) {
  const { manager } = useBoundary()
  const boundaryState = useBoundaryState(config.id)
  const [isPreloading, setIsPreloading] = useState(false)
  const [componentLoaded, setComponentLoaded] = useState(false)

  // Track island component loading
  const { markLoaded } = useSimpleLoading({
    islandId: config.id
  })

  // Mark as loaded when component successfully renders
  useEffect(() => {
    if (componentLoaded) {
      markLoaded()
    }
  }, [componentLoaded])

  // Dev mode: Force skeleton display for testing
  const forceSkeletonMode = shouldShowSkeleton(config.id)

  // Register island metadata with BoundaryManager on mount
  useEffect(() => {
    manager.registerIsland(
      {
        id: config.id,
        position: config.position,
        name: config.name,
        boundaries: config.boundaries,
      },
      config.boundaries
    )

    // Register preload callback (triggered at 2x loadRadius)
    if (!config.loadImmediately) {
      manager.registerPreload(config.id, () => {
        setIsPreloading(true)
        // The actual preload happens when React tries to render the lazy component
        // This just sets a flag to trigger the lazy load
      })
    }

    return () => {
      manager.unregisterIsland(config.id)
    }
  }, [config, manager])

  const SkeletonComponent = config.skeleton
  const IslandComponent = config.component

  // Wrapper component to detect when island has loaded
  const IslandWrapper = () => {
    useEffect(() => {
      setComponentLoaded(true)
    }, [])

    return <IslandComponent />
  }

  // Dev mode: Force skeleton display
  if (forceSkeletonMode) {
    return <SkeletonComponent />
  }

  // Islands that load immediately (like home) should always render
  if (config.loadImmediately) {
    return (
      <Suspense fallback={<SkeletonComponent />}>
        <IslandWrapper />
      </Suspense>
    )
  }

  // For other islands, only load when within load radius or preloading has started
  const shouldLoad = boundaryState.isLoaded || isPreloading

  if (!shouldLoad) {
    // Show skeleton until we're close enough to start loading
    return <SkeletonComponent />
  }

  // Within load radius - show island with Suspense boundary
  return (
    <Suspense fallback={<SkeletonComponent />}>
      <IslandWrapper />
    </Suspense>
  )
}
