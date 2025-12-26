import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useWorld } from '../../context/WorldContext'
import { useBoundary } from '../../context/BoundaryContext'
import { BoundaryVisualizer } from '../boundary/BoundaryVisualizer'
import type { BoundaryConfig } from '../../context/BoundaryContext'

interface IslandProps {
  id: string
  position: [number, number, number]
  name: string
  boundaries?: BoundaryConfig
  children?: ReactNode
}

export function Island({ id, position, name, boundaries, children }: IslandProps) {
  const { registerIsland, unregisterIsland } = useWorld()
  const { manager } = useBoundary()

  useEffect(() => {
    // Register island with WorldContext
    registerIsland({ id, position, name, boundaries })

    // Register with BoundaryManager if boundaries are provided
    if (boundaries) {
      manager.registerIsland({ id, position, name, boundaries }, boundaries)
    }

    return () => {
      unregisterIsland(id)
      if (boundaries) {
        manager.unregisterIsland(id)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, position[0], position[1], position[2], name, registerIsland, unregisterIsland, boundaries])

  // Apply position to DOM element to match 3D space position
  return (
    <>
      {/* Render boundary visualizer circles if boundaries are defined */}
      {boundaries && (
        <BoundaryVisualizer
          position={position}
          boundaries={boundaries}
          islandId={id}
        />
      )}

      <div
        data-island-id={id}
        className={name}
        style={{
          position: 'absolute',
          left: `${position[0]}px`,
          top: `${position[1]}px`,
          transform: 'translate(-50%, -50%)',
          // z-index could be derived from position[2] if needed for layering
        }}
      >
        {children}
      </div>
    </>
  )
}