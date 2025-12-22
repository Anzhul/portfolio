import { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useBoundary } from '../../context/BoundaryContext'
import { generateRoutePath, debounce } from '../../utils/routing'

/**
 * RouteSync Component
 *
 * Automatically updates the URL based on which island/section
 * is closest to the viewport's top-left corner.
 *
 * Routes format:
 * - Island: /island-id
 * - Section: /island-id/section-id
 * - Root: / (when no entities)
 */
export function RouteSync() {
  const { manager } = useBoundary()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    // Debounced navigation to avoid too frequent URL updates
    const debouncedNavigate = debounce((path: string) => {
      // Only update if path changed
      if (location.pathname !== path) {
        navigate(path, { replace: true })  // Use replace to avoid cluttering history
        console.log(`🧭 Route updated: ${path}`)
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
