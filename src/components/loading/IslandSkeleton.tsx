import './IslandSkeleton.scss'

export interface IslandSkeletonProps {
  islandId: string
  position: [number, number, number]
}

/**
 * Base skeleton component for islands during loading
 * Extend this or create custom skeletons for each island
 */
export function IslandSkeleton({ islandId, position }: IslandSkeletonProps) {
  return (
    <div
      className="island-skeleton"
      style={{
        transform: `translate(${position[0]}px, ${position[1]}px)`,
      }}
      data-island-id={islandId}
    >
      <div className="skeleton-content">
        <div className="skeleton-pulse">
          <div className="skeleton-text skeleton-title" />
          <div className="skeleton-text skeleton-subtitle" />
          <div className="skeleton-box" />
        </div>
      </div>
    </div>
  )
}