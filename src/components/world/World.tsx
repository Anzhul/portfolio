import type { ReactNode } from 'react'
import './world.scss'

interface WorldProps {
  dimensions?: [number, number]
  children?: ReactNode
}

export function World({ dimensions = [2000, 2000], children }: WorldProps) {
  const [width, height] = dimensions

  return (
    <div
      className="world-content"
      style={{
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      {children}
    </div>
  )
}
