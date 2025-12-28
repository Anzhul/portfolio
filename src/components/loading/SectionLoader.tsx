import { Suspense, useEffect, useState } from 'react'
import { useBoundary, useSectionBoundaryState } from '../../context/BoundaryContext'
import type { SectionConfig } from '../../config/sectionRegistry'
import { shouldShowSkeleton } from '../../utils/devMode'
import { useSimpleLoading } from '../../hooks/useSimpleLoading'

export interface SectionLoaderProps {
  config: SectionConfig
}

/**
 * Handles lazy loading of section components with Suspense boundaries
 *
 * Loading strategy (same as IslandLoader but for sections):
 * 1. Immediately register section metadata with BoundaryManager
 * 2. Show skeleton while section is outside load radius
 * 3. Preload section component at 2x loadRadius (in background)
 * 4. Show Suspense skeleton when entering loadRadius (if not yet loaded)
 * 5. Render actual section component once loaded
 * 6. Keep section mounted even when outside boundaries
 *
 * Dev Mode:
 * - Add ?skeleton=true to URL to show all skeletons
 * - Add ?skeleton=section-id to show specific section skeleton
 */
export function SectionLoader({ config }: SectionLoaderProps) {
  const { manager } = useBoundary()
  const boundaryState = useSectionBoundaryState(config.id)
  const [isPreloading, setIsPreloading] = useState(false)
  const [componentLoaded, setComponentLoaded] = useState(false)

  // Track section component loading
  const { markLoaded } = useSimpleLoading({
    islandId: config.islandId
  })

  // Mark as loaded when component successfully renders
  useEffect(() => {
    if (componentLoaded) {
      markLoaded()
    }
  }, [componentLoaded])

  // Dev mode: Force skeleton display for testing
  const forceSkeletonMode = shouldShowSkeleton(config.id)

  // Register section metadata with BoundaryManager on mount
  useEffect(() => {
    manager.registerSection(
      {
        id: config.id,
        position: config.position,
        islandId: config.islandId,  // Pass island ID for routing
      },
      config.boundaries
    )

    // Register preload callback (triggered at 2x loadRadius)
    if (config.lazy) {
      manager.registerPreload(config.id, () => {
        setIsPreloading(true)
        // The actual preload happens when React tries to render the lazy component
      })
    }

    return () => {
      manager.unregisterSection(config.id)
    }
  }, [config, manager])

  const SkeletonComponent = config.skeleton
  const SectionComponent = config.component

  // Wrapper component to detect when section has loaded
  const SectionWrapper = () => {
    useEffect(() => {
      setComponentLoaded(true)
    }, [])

    return <SectionComponent />
  }

  // Dev mode: Force skeleton display
  if (forceSkeletonMode) {
    return <SkeletonComponent />
  }

  // If not lazy, just render the section directly
  if (!config.lazy) {
    return <SectionWrapper />
  }

  // For lazy sections, only load when within load radius or preloading has started
  const shouldLoad = boundaryState.isLoaded || isPreloading

  if (!shouldLoad) {
    // Show skeleton until we're close enough to start loading
    return <SkeletonComponent />
  }

  // Within load radius - show section with Suspense boundary
  return (
    <Suspense fallback={<SkeletonComponent />}>
      <SectionWrapper />
    </Suspense>
  )
}
