import './SectionSkeleton.scss'

export interface SectionSkeletonProps {
  sectionId: string
}

/**
 * Base skeleton component for sections during loading
 * Extend this or create custom skeletons for each section
 */
export function SectionSkeleton({ sectionId }: SectionSkeletonProps) {
  return (
    <div
      className="section-skeleton"
      data-section-id={sectionId}
    >
      <div className="section-skeleton-content">
        <div className="skeleton-pulse">
          <div className="skeleton-text skeleton-heading" />
          <div className="skeleton-text skeleton-line" />
          <div className="skeleton-text skeleton-line" />
          <div className="skeleton-text skeleton-line short" />
        </div>
      </div>
    </div>
  )
}
