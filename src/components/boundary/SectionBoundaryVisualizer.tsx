import { useMemo } from 'react'
import type { BoundaryConfig } from './boundary'

interface SectionBoundaryVisualizerProps {
  position: [number, number, number]
  boundaries: BoundaryConfig
  sectionId: string
}

/**
 * Visual boundary indicators for sections
 * Shows load radius (green) and active radius (cyan)
 * Different colors from islands for easy distinction
 */
export function SectionBoundaryVisualizer({ position, boundaries }: SectionBoundaryVisualizerProps) {
  const { loadRadius, activeRadius } = boundaries

  // Memoize circle styles to avoid recalculation
  const loadCircleStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: `${position[0]}px`,
    top: `${position[1]}px`,
    width: `${loadRadius * 2}px`,
    height: `${loadRadius * 2}px`,
    borderRadius: '50%',
    border: '3px dashed #22c55e',  // Green dashed for sections
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none' as const,
    opacity: 0.6,
    zIndex: 999,  // Slightly below island boundaries
  }), [position, loadRadius])

  const activeCircleStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: `${position[0]}px`,
    top: `${position[1]}px`,
    width: `${activeRadius * 2}px`,
    height: `${activeRadius * 2}px`,
    borderRadius: '50%',
    border: '2px dashed #06b6d4',  // Cyan dashed for sections
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none' as const,
    opacity: 0.5,
    zIndex: 1000,
  }), [position, activeRadius])

  // Label style
  const labelStyle = useMemo(() => ({
    position: 'absolute' as const,
    left: `${position[0]}px`,
    top: `${position[1] - activeRadius - 30}px`,
    transform: 'translateX(-50%)',
    background: 'rgba(6, 182, 212, 0.9)',  // Cyan background
    color: 'white',
    padding: '4px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    pointerEvents: 'none' as const,
    zIndex: 1002,
    whiteSpace: 'nowrap' as const,
  }), [position, activeRadius])

  return (
    <>
      {/* Load boundary (green dashed circle) */}
      <div style={loadCircleStyle} />

      {/* Active boundary (cyan dashed circle) */}
      <div style={activeCircleStyle} />

      {/* Section center marker */}
      <div style={{
        position: 'absolute',
        left: `${position[0]}px`,
        top: `${position[1]}px`,
        width: '12px',
        height: '12px',
        background: '#06b6d4',
        borderRadius: '50%',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 1001,
        border: '2px solid white',
      }} />

      {/* Label */}
      <div style={labelStyle}>
        📄 Section
      </div>
    </>
  )
}
