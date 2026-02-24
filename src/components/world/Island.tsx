import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { BoundaryVisualizer } from '../boundary/BoundaryVisualizer'
import type { BoundaryConfig } from '../../context/BoundaryContext'
import { IslandPositionProvider } from '../../context/IslandPositionContext'

interface IslandProps {
  id: string
  position: [number, number, number]
  name: string
  boundaries?: BoundaryConfig
  children?: ReactNode
}

// Only show boundary debug circles with ?boundaries=true URL param
const showBoundaryVisualizer = typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('boundaries') === 'true'

export function Island({ id, position, boundaries, children }: IslandProps) {
  // Islands are pre-registered by BoundaryProvider from ISLAND_REGISTRY.
  // No runtime registration here — avoids WorldContext re-render cascade
  // and BoundaryManager state resets that caused multi-frame jank.

  // Memoize context value to prevent unnecessary re-renders of consumers
  const contextValue = useMemo(
    () => ({ position: [position[0], position[1], position[2]] as [number, number, number], id }),
    [position[0], position[1], position[2], id]
  )

  // Build className without active state (BoundaryManager will add it via DOM)
  // Loading classes will be added by SimpleLoadingManager
  const classNames = [
    id, // Use ID instead of name to avoid spaces in class names
    'loading', // Start as loading
    // Removed: boundaryState.isActive ? 'active' : ''
    // BoundaryManager will add 'active' class directly to DOM
  ]
    .filter(Boolean)
    .join(' ')

  // Apply position to DOM element to match 3D space position
  return (
    <>
      {/* Render boundary visualizer circles only with ?boundaries=true */}
      {showBoundaryVisualizer && boundaries && (
        <BoundaryVisualizer
          position={position}
          boundaries={boundaries}
          islandId={id}
        />
      )}

      <div
        data-island-id={id}
        className={classNames}
        style={{
          position: 'absolute',
          left: `${position[0]}px`,
          top: `${position[1]}px`,
          transform: 'translate(-50%, -50%)',
          willChange: 'transform',
        }}
      >
        <IslandPositionProvider value={contextValue}>
          {children}
        </IslandPositionProvider>
      </div>
    </>
  )
}