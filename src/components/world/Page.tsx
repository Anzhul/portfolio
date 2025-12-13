import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useWorld } from '../../context/WorldContext'

interface PageProps {
  id: string
  islandId: string
  name: string
  content: string
  description?: string
  children?: ReactNode
}

export function Page({ id, islandId, name, content, description, children }: PageProps) {
  const { registerPage, unregisterPage } = useWorld()

  useEffect(() => {
    registerPage({ id, islandId, name, content, description })
    return () => unregisterPage(islandId, id)
  }, [id, islandId, name, content, description, registerPage, unregisterPage])

  // TODO: Add page rendering logic here
  return <div data-page-id={id}>{children || content}</div>
}
