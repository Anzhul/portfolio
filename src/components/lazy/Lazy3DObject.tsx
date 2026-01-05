import { Suspense, useEffect, useState, useRef } from 'react'
import './Lazy3DObject.scss'

export type LoadStrategy = 'immediate' | 'delayed' | 'intersection' | 'interaction'

export interface Lazy3DObjectProps {
  // How to trigger loading
  loadStrategy: LoadStrategy

  // Delay in ms (for 'delayed' strategy)
  delay?: number

  // Intersection options (for 'intersection' strategy)
  intersectionMargin?: string
  intersectionThreshold?: number

  // Component to load (must be lazy-loaded)
  component: React.LazyExoticComponent<any>

  // Props to pass to the 3D component
  componentProps?: Record<string, any>

  // Placeholder content (shown while loading or before load)
  placeholder?: React.ReactNode

  // Loading fallback (shown during Suspense)
  loadingFallback?: React.ReactNode

  // CSS class for container
  className?: string

  // Optional callback when component starts loading
  onLoadStart?: () => void

  // Optional callback when component finishes loading
  onLoadComplete?: () => void
}

/**
 * Lazy3DObject - A wrapper component for progressively loading React Three Fiber components
 *
 * This component delays the loading of heavy R3F libraries until they're actually needed,
 * keeping your initial page load fast and lightweight.
 *
 * @example
 * // Load after 2 seconds
 * <Lazy3DObject
 *   loadStrategy="delayed"
 *   delay={2000}
 *   component={HeroScene}
 *   placeholder={<div>Loading 3D...</div>}
 * />
 *
 * @example
 * // Load when scrolled into view
 * <Lazy3DObject
 *   loadStrategy="intersection"
 *   intersectionMargin="100px"
 *   component={FloatingObject}
 * />
 *
 * @example
 * // Load on user click/hover
 * <Lazy3DObject
 *   loadStrategy="interaction"
 *   component={InteractiveModel}
 * />
 */
export const Lazy3DObject: React.FC<Lazy3DObjectProps> = ({
  loadStrategy,
  delay = 2,
  intersectionMargin = '100px',
  intersectionThreshold = 0.01,
  component: Component,
  componentProps = {},
  placeholder,
  loadingFallback,
  className = '',
  onLoadStart,
  onLoadComplete,
}) => {
  const [shouldLoad, setShouldLoad] = useState(loadStrategy === 'immediate')
  const [hasInteracted, setHasInteracted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasStartedLoading = useRef(false)

  // Trigger load and callbacks
  const startLoading = () => {
    if (!hasStartedLoading.current) {
      hasStartedLoading.current = true
      setShouldLoad(true)
      onLoadStart?.()
    }
  }

  // Strategy: Delayed
  useEffect(() => {
    if (loadStrategy === 'delayed') {
      const timer = setTimeout(() => {
        startLoading()
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [loadStrategy, delay])

  // Strategy: Intersection Observer
  useEffect(() => {
    if (loadStrategy !== 'intersection' || !containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          startLoading()
          observer.disconnect()
        }
      },
      {
        rootMargin: intersectionMargin,
        threshold: intersectionThreshold,
      }
    )

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [loadStrategy, intersectionMargin, intersectionThreshold])

  // Strategy: Immediate (already handled in useState initial value)
  useEffect(() => {
    if (loadStrategy === 'immediate') {
      startLoading()
    }
  }, [loadStrategy])

  // Strategy: User Interaction
  const handleInteraction = () => {
    if (loadStrategy === 'interaction' && !hasInteracted) {
      setHasInteracted(true)
      startLoading()
    }
  }

  // Handle load complete
  const handleLoadComplete = () => {
    onLoadComplete?.()
  }

  // Default loading fallback - only use default if prop is undefined (not null)
  const defaultLoadingFallback = loadingFallback !== undefined ? loadingFallback : (
    <div className="lazy-3d-loading">
      <div className="loading-spinner" />
    </div>
  )

  // Default placeholder (shown before loading starts) - only use default if prop is undefined (not null)
  const defaultPlaceholder = placeholder !== undefined ? placeholder : (
    <div className="lazy-3d-placeholder">
      <div className="placeholder-shape" />
    </div>
  )

  return (
    <div
      ref={containerRef}
      className={`lazy-3d-container ${className} ${shouldLoad ? 'loading' : 'waiting'} ${hasInteracted ? 'interacted' : ''}`}
      onClick={handleInteraction}
      onMouseEnter={loadStrategy === 'interaction' && !hasInteracted ? handleInteraction : undefined}
      data-load-strategy={loadStrategy}
    >
      {shouldLoad ? (
        <Suspense fallback={defaultLoadingFallback}>
          <LoadedComponent
            Component={Component}
            componentProps={componentProps}
            onLoadComplete={handleLoadComplete}
          />
        </Suspense>
      ) : (
        <>
          {defaultPlaceholder}

          {/* Show hint for interaction strategy */}
          {loadStrategy === 'interaction' && !hasInteracted && (
            <div className="interaction-hint">
              <span>Click to view 3D</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// Helper component to handle the loaded component lifecycle
interface LoadedComponentProps {
  Component: React.LazyExoticComponent<any>
  componentProps: Record<string, any>
  onLoadComplete: () => void
}

const LoadedComponent: React.FC<LoadedComponentProps> = ({
  Component,
  componentProps,
  onLoadComplete
}) => {
  useEffect(() => {
    // Call onLoadComplete when component mounts (meaning it's fully loaded)
    onLoadComplete()
  }, [onLoadComplete])

  return <Component {...componentProps} />
}
