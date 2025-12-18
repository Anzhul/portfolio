import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { CameraViewport } from '../canvas/CameraViewport'
import R3FCanvas from '../canvas/R3FCanvas'
import { useScene } from '../../context/SceneContext'
import './world.scss'

interface WorldProps {
  dimensions?: [number, number]
  children?: ReactNode
}

export function World({ dimensions = [2000, 2000], children }: WorldProps) {
  const [width, height] = dimensions
  const { objects } = useScene()

  // Sort objects by zIndex for proper render order
  // useMemo caches the result and only re-sorts when objects array changes
  const sortedObjects = useMemo(
    () => [...objects].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)),
    [objects]
  )

  return (
    <div className="world-container" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Single 3D canvas - contains all 3D objects */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        <R3FCanvas>
          {/* Render all 3D objects in sorted order */}
          {sortedObjects.map(({ id, component }) => (
            <group key={id}>
              {component}
            </group>
          ))}
        </R3FCanvas>
      </div>

      {/* HTML content layer - positioned above 3D canvas */}
      <div style={{ position: 'relative', zIndex: 5 }}>
        <CameraViewport>
          <div
            className="world-content"
            style={{
              width: `${width}px`,
              height: `${height}px`
            }}
          >
            {children}
          </div>
        </CameraViewport>
      </div>
    </div>
  )
}
