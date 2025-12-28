import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useWorld } from '../../context/WorldContext'
import type { BoundaryConfig } from '../../context/BoundaryContext'
import { useSectionBoundaryState } from '../../context/BoundaryContext'
import { SectionBoundaryVisualizer } from '../boundary/SectionBoundaryVisualizer'

interface SectionProps {
  id: string
  islandId: string
  name: string
  position: [number, number, number]
  description?: string
  boundaries?: BoundaryConfig  // Optional boundary configuration
  showBoundaries?: boolean      // Whether to show visual boundaries (default: false)
  children?: ReactNode
}

export function Section({
  id,
  islandId,
  name,
  position,
  description,
  boundaries,
  showBoundaries = false,
  children
}: SectionProps) {
  const { registerSection, unregisterSection } = useWorld()
  const boundaryState = useSectionBoundaryState(id)

  useEffect(() => {
    registerSection({ id, islandId, name, position, description })
    return () => unregisterSection(islandId, id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, islandId, name, position[0], position[1], position[2], description, registerSection, unregisterSection])

  // Build className with active state (loading classes will be added by SimpleLoadingManager)
  const classNames = [
    name,
    'loading', // Start as loading
    boundaryState.isActive ? 'active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <>
      {/* Show boundary visualizer if boundaries are provided and enabled */}
      {boundaries && showBoundaries && (
        <SectionBoundaryVisualizer
          position={position}
          boundaries={boundaries}
          sectionId={id}
        />
      )}

      {/* Section content */}
      <div data-section-id={id} className={classNames}>{children}</div>
    </>
  )
}
