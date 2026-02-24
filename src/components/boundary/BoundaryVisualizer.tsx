import { useMemo } from 'react'
import type { BoundaryConfig } from '../../context/BoundaryContext'

interface BoundaryVisualizerProps {
  position: [number, number, number]
  boundaries: BoundaryConfig
  islandId: string
}

export function BoundaryVisualizer({ position, boundaries }: BoundaryVisualizerProps) {
  const { loadRadius, activeRadius } = boundaries

  // Memoize circle styles to avoid recalculation
  const loadCircleStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: `${position[0]}px`,
    top: `${position[1]}px`,
    width: `${loadRadius * 2}px`,
    height: `${loadRadius * 2}px`,
    borderRadius: '50%',
    border: '4px solid red',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none' as const,
    opacity: 0.7,
    zIndex: 1000,
  }), [position, loadRadius])

  const activeCircleStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: `${position[0]}px`,
    top: `${position[1]}px`,
    width: `${activeRadius * 2}px`,
    height: `${activeRadius * 2}px`,
    borderRadius: '50%',
    border: '3px solid blue',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none' as const,
    opacity: 0.5,
    zIndex: 1001,
  }), [position, activeRadius])

  return (
    <>
      {/* Load boundary (red circle) */}
      <div style={loadCircleStyle} />

      {/* Active boundary (blue circle) */}
      <div style={activeCircleStyle} />
    </>
  )
}
