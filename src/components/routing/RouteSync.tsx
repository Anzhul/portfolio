import { useEffect, useRef, type RefObject } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBoundary } from '../../context/BoundaryContext'
import { useCamera } from '../../context/CameraContext'
import type { CameraViewportHandle } from '../canvas/CameraViewport'
import { generateRoutePath, parseRoutePath, debounce } from '../../utils/routing'

interface RouteSyncProps {
  cameraViewportRef: RefObject<CameraViewportHandle | null>
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
export function RouteSync({ cameraViewportRef }: RouteSyncProps) {
  const { manager } = useBoundary()
  const camera = useCamera()
  const navigate = useNavigate()
  const location = useLocation()
  const isNavigatingFromUrl = useRef(false)
  const isUpdatingUrlFromViewport = useRef(false)

  // Effect 1: Navigate camera to island on URL change (only for manual URL changes)
  useEffect(() => {
    // Skip if the URL was changed by viewport-based routing
    if (isUpdatingUrlFromViewport.current) {
      console.log(`🔒 RouteSync: Skipping moveTo - URL was updated by viewport`)
      return
    }

    const { islandId } = parseRoutePath(location.pathname)

    // Redirect root path to home island
    if (!islandId && location.pathname === '/') {
      navigate('/home', { replace: true })
      return
    }

    if (islandId && cameraViewportRef.current) {
      const position = manager.getIslandPosition(islandId)

      if (position) {
        // Set flag to prevent viewport-based routing from interfering
        isNavigatingFromUrl.current = true

        // Get current zoom and viewport dimensions
        const currentZoom = camera.getState().zoom
        const zoomoffsetX = (window.innerWidth / 2) - (window.innerWidth * currentZoom / 2);
        const zoomoffsetY = (window.innerHeight / 2) - (window.innerHeight * currentZoom / 2);

        // Calculate camera position to center the island
        const [islandX, islandY, islandZ] = position
        const cameraX = -islandX
        const cameraY = -islandY



    const screenLeft = (cameraX * currentZoom) - zoomoffsetX;
    const screenTop = (cameraY * currentZoom) - zoomoffsetY;
    const screenRight = screenLeft + (window.innerWidth) //* currentZoom);
    const screenBottom = screenTop + (window.innerHeight) //* currentZoom);

    // Calculate center of viewport
    const viewportCenterX = (screenLeft + screenRight) / 2;
    const viewportCenterY = (screenTop + screenBottom) / 2;

        // Instant jump to island with decoupled 2D/3D positions
        cameraViewportRef.current.moveTo(
          viewportCenterX,          // 3D scene position (controls plane position)
          viewportCenterY,
          cameraX,
          cameraY,
          islandZ,
          undefined,        // Keep current zoom
          false
        )

        // Clear flag after a delay
        setTimeout(() => {
          isNavigatingFromUrl.current = false
          console.log(`🔓 URL unlocked, viewport can now update URL`)
        }, 1000)
      }
    }
  }, [location.pathname, manager, camera, cameraViewportRef])

  // Effect 2: Update URL based on viewport position (viewport → URL)
  useEffect(() => {
    // Debounced navigation to avoid too frequent URL updates
    const debouncedNavigate = debounce((path: string) => {
      // Skip if we're currently navigating from a URL change
      if (isNavigatingFromUrl.current) {
        return
      }

      // Only update if path changed
      if (location.pathname !== path) {
        // Set flag to indicate this is a viewport-based URL update
        isUpdatingUrlFromViewport.current = true

        navigate(path, { replace: true })  // Use replace to avoid cluttering history
        console.log(`🧭 Route updated by viewport: ${path}`)

        // Clear flag after a short delay (before Effect 1 can run)
        setTimeout(() => {
          isUpdatingUrlFromViewport.current = false
        }, 100)
      }
    }, 300)  // Wait 300ms after last route change

    // Subscribe to route changes from BoundaryManager
    const unsubscribe = manager.onRouteChange((entity) => {
      if (!entity) {
        debouncedNavigate('/')
        return
      }

      const sectionIslandMap = manager.getSectionIslandMap()
      const path = generateRoutePath(entity, sectionIslandMap)
      debouncedNavigate(path)
    })

    return unsubscribe
  }, [manager, navigate, location.pathname])

  // This component doesn't render anything
  return null
}
