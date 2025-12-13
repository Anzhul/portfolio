import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useWorld } from '../../context/WorldContext'

interface SectionProps {
  id: string
  islandId: string
  name: string
  position: [number, number, number]
  description?: string
  children?: ReactNode
}

export function Section({ id, islandId, name, position, description, children }: SectionProps) {
  const { registerSection, unregisterSection } = useWorld()

  useEffect(() => {
    registerSection({ id, islandId, name, position, description })
    return () => unregisterSection(islandId, id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, islandId, name, position[0], position[1], position[2], description, registerSection, unregisterSection])

  // TODO: Add 3D rendering logic here
  return <div data-section-id={id} className={name}>{children}</div>
}
