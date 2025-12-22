/**
 * Development utilities for testing loading states
 */

/**
 * Check if skeleton preview mode is enabled via URL parameter
 * Usage: http://localhost:5175/?skeleton=true
 */
export function isSkeletonPreviewMode(): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  return params.get('skeleton') === 'true'
}

/**
 * Check if a specific island should show skeleton
 * Usage: http://localhost:5175/?skeleton=home,projects
 */
export function shouldShowSkeleton(islandId: string): boolean {
  if (typeof window === 'undefined') return false
  const params = new URLSearchParams(window.location.search)
  const skeletonParam = params.get('skeleton')

  if (!skeletonParam) return false
  if (skeletonParam === 'true') return true // All skeletons

  // Specific islands: ?skeleton=home,projects
  const islandIds = skeletonParam.split(',').map(id => id.trim())
  return islandIds.includes(islandId)
}

/**
 * Get artificial delay for testing loading states
 * Usage: http://localhost:5175/?delay=3000
 */
export function getArtificialDelay(): number {
  if (typeof window === 'undefined') return 0
  const params = new URLSearchParams(window.location.search)
  const delay = params.get('delay')
  return delay ? parseInt(delay, 10) : 0
}
