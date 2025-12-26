export function AboutIslandSkeleton() {
  return (
    <div className="about-island-skeleton">
      <div className="about-skeleton-content">
        {/* Hero section skeleton */}
        <div className="skeleton-hero">
          <div className="skeleton-avatar" />
          <div className="skeleton-text skeleton-name" />
          <div className="skeleton-text skeleton-title" />
          <div className="skeleton-text skeleton-subtitle" />
        </div>

        {/* Section skeleton */}
        <div className="skeleton-section">
          <div className="skeleton-text skeleton-heading" />
          <div className="skeleton-text skeleton-line" />
          <div className="skeleton-text skeleton-line" />
          <div className="skeleton-text skeleton-line short" />
        </div>

        {/* 3D cube placeholder */}
        <div className="skeleton-cube" />
      </div>
    </div>
  )
}
