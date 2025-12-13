import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useWorld } from '../../context/WorldContext'

interface IslandProps {
  id: string
  position: [number, number, number]
  name: string
  children?: ReactNode
}

export function Island({ id, position, name, children }: IslandProps) {
  const { registerIsland, unregisterIsland } = useWorld()

  useEffect(() => {
    registerIsland({ id, position, name })
    return () => unregisterIsland(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, position[0], position[1], position[2], name, registerIsland, unregisterIsland])

  // TODO: Add 3D rendering logic here
  return <div data-island-id={id} className={name}>{children}</div>
}