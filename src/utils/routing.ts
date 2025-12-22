/**
 * Routing utilities for determining active island/section based on viewport position
 */

export interface EntityPosition {
  id: string
  type: 'island' | 'section'
  islandId?: string  // For sections, reference to parent island
  position: [number, number, number]
  distance: number
}

/**
 * Calculate distance from an entity position to a viewport point (center or other reference)
 */
export function distanceToViewportTopLeft(
  entityPosition: [number, number, number],
  viewportPoint: [number, number]
): number {
  const dx = entityPosition[0] - viewportPoint[0]
  const dy = entityPosition[1] - viewportPoint[1]
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * Find the closest island to a viewport reference point (typically the center)
 */
export function findClosestEntity(
  islands: Map<string, { position: [number, number, number] }>,
  _sections: Map<string, { position: [number, number, number] }>,
  viewportPoint: [number, number]
): EntityPosition | null {
  const entities: EntityPosition[] = []

  // Add all islands (sections are ignored for routing)
  islands.forEach((island, id) => {
    entities.push({
      id,
      type: 'island',
      position: island.position,
      distance: distanceToViewportTopLeft(island.position, viewportPoint),
    })
  })

  if (entities.length === 0) return null

  // Sort by distance and return closest
  entities.sort((a, b) => a.distance - b.distance)
  return entities[0]
}

/**
 * Generate route path from entity
 */
export function generateRoutePath(entity: EntityPosition, sectionIslandMap: Map<string, string>): string {
  if (entity.type === 'island') {
    return `/${entity.id}`
  }

  // For sections, format as /island-id/section-id
  const islandId = sectionIslandMap.get(entity.id)
  if (!islandId) {
    console.warn(`Section ${entity.id} has no parent island mapping`)
    return '/'
  }

  return `/${islandId}/${entity.id}`
}

/**
 * Parse route path to extract island and section IDs
 */
export function parseRoutePath(path: string): { islandId: string | null; sectionId: string | null } {
  const segments = path.split('/').filter(Boolean)

  if (segments.length === 0) {
    return { islandId: null, sectionId: null }
  }

  if (segments.length === 1) {
    return { islandId: segments[0], sectionId: null }
  }

  return {
    islandId: segments[0],
    sectionId: segments[1],
  }
}

/**
 * Debounce function to limit route update frequency
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout !== null) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)
  }
}
