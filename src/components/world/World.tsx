import type { ReactNode } from 'react'
import { CameraViewport } from '../canvas/CameraViewport'
import './world.scss'

interface WorldProps {
  dimensions?: [number, number]
  children?: ReactNode
}

export function World({ dimensions = [2000, 2000], children }: WorldProps) {
  const [width, height] = dimensions

  return (
    <div className="world-container">
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
  )
}
