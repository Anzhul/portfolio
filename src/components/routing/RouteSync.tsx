import { useEffect, useRef, type RefObject } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBoundary } from '../../context/BoundaryContext'
import { useCamera } from '../../context/CameraContext'
import type { CameraViewportHandle } from '../canvas/CameraViewport'
import { generateRoutePath, parseRoutePath, debounce } from '../../utils/routing'

interface RouteSyncProps {
  cameraViewportRef: RefObject<CameraViewportHandle | null>
  isActive: boolean  // Only sync routes when 3D experience is visible
}

/**
 * RouteSync Component
 *
 * Bi-directional routing:
 * 1. Viewport position → URL updates (when user pans around)
 * 2. URL → Camera navigation (when user navigates to URL directly)
 *
 * Routes format:
 * - Island: /island-id
 * - Root: / (when no entities)
 */
export function RouteSync({ cameraViewportRef, isActive }: RouteSyncProps) {
  const { manager } = useBoundary()
  const camera = useCamera()
  const navigate = useNavigate()
  const location = useLocation()
  const isNavigatingFromUrl = useRef(false)
  const isUpdatingUrlFromViewport = useRef(false)
  const lastActiveState = useRef(false)  // Initialize to false to detect first activation
  const hasInitialized = useRef(false)

  // Effect 1: Navigate camera to island on URL change (only for manual URL changes)
  useEffect(() => {
    // Track state transitions
    const wasActive = lastActiveState.current
    const nowActive = isActive

    // Don't sync routes when 3D experience is hidden
    if (!nowActive) {
      lastActiveState.current = false
      return
    }

    // If we just became active (transitioning from inactive to active), don't reposition camera
    // The camera is already at the preserved position from before we went inactive
    const justBecameActive = !wasActive && nowActive && hasInitialized.current
    if (justBecameActive) {
      console.log(`🔄 RouteSync reactivated - preserving camera position at`, camera.getState().truePosition)
      lastActiveState.current = nowActive
      return
    }

    // Skip if the URL was changed by viewport-based routing
    if (isUpdatingUrlFromViewport.current) {
      console.log(`🔒 RouteSync: Skipping moveTo - URL was updated by viewport`)
      return
    }

    // Mark as initialized after first active state
    hasInitialized.current = true

    const { islandId } = parseRoutePath(location.pathname)

    if (islandId && cameraViewportRef.current) {
      const position = manager.getIslandPosition(islandId)

      if (position) {
        // Set flag to prevent viewport-based routing from interfering
        isNavigatingFromUrl.current = true

        const [islandX, islandY, islandZ] = position

        // Use simplified moveToIsland function with instant navigation
        cameraViewportRef.current.moveToIsland(islandX, islandY, islandZ, {
          animated: false  // Instant jump for URL navigation
        })

        // Clear flag after a delay
        setTimeout(() => {
          isNavigatingFromUrl.current = false
          console.log(`🔓 URL unlocked, viewport can now update URL`)
        }, 1000)
      }
    }

    lastActiveState.current = isActive
  }, [location.pathname, manager, camera, cameraViewportRef, navigate, isActive])

  // Effect 2: Update URL based on viewport position (viewport → URL)
  useEffect(() => {
    // Don't sync routes when 3D experience is hidden
    if (!isActive) {
      return
    }

    // If we just became active, trigger an immediate boundary check to get current closest island
    const justBecameActive = !lastActiveState.current && isActive

    if (justBecameActive) {
      console.log(`🔄 RouteSync activated - will sync URL to current camera position`)
      // Force boundary check on next frame
      setTimeout(() => {
        const cameraState = camera.getState()
        console.log(`📍 Current camera position: [${cameraState.truePosition[0]}, ${cameraState.truePosition[1]}]`)
      }, 0)
    }

    const delayBeforeSync = justBecameActive ? 200 : 0  // Small delay to let boundary check complete

    const timeoutId = setTimeout(() => {
      // Debounced navigation to avoid too frequent URL updates
      const debouncedNavigate = debounce((path: string) => {
        // Skip if we're currently navigating from a URL change
        if (isNavigatingFromUrl.current) {
          console.log(`🔒 Skipping viewport navigation - locked by URL navigation`)
          return
        }

        // Only update if path changed
        if (location.pathname !== path) {
          // Set flag to indicate this is a viewport-based URL update
          isUpdatingUrlFromViewport.current = true

          navigate(path, { replace: true })  // Use replace to avoid cluttering history
          console.log(`🧭 Route updated by viewport: ${location.pathname} → ${path}`)

          // Clear flag after a short delay (before Effect 1 can run)
          setTimeout(() => {
            isUpdatingUrlFromViewport.current = false
          }, 100)
        }
      }, 300)  // Wait 300ms after last route change

      // Subscribe to route changes from BoundaryManager
      const unsubscribe = manager.onRouteChange((entity) => {
        console.log(`🗺️ BoundaryManager route change:`, entity)
        if (!entity) {
          // Don't navigate away from 3D experience when no islands are nearby
          // Just keep the current URL/island to avoid exiting to lightweight home
          console.log(`📍 No nearby islands - keeping current route`)
          return
        }

        const sectionIslandMap = manager.getSectionIslandMap()
        const path = generateRoutePath(entity, sectionIslandMap)
        debouncedNavigate(path)
      })

      // Store unsubscribe in outer scope for cleanup
      cleanupRef.current = unsubscribe
    }, delayBeforeSync)

    const cleanupRef = { current: () => {} }

    return () => {
      clearTimeout(timeoutId)
      cleanupRef.current()
    }
  }, [manager, navigate, location.pathname, isActive, camera])

  // This component doesn't render anything
  return null
}
