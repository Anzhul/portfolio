import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

// World state provider - manages 3D world state, islands, sections, and navigation

export interface Island {
  id: string
  position: [number, number, number]
  name: string
  color?: string
}

export interface Section {
  id: string
  islandId: string
  name: string
  route: string
  angle: number  // Position around island in radians
}

export interface Page {
    id: string
    sectionId: string
    content: string
}

interface WorldContextType {
  // Islands in the world
  islands: Island[]
  setIslands: (islands: Island[]) => void
  activeIslandId: string | null
  setActiveIslandId: (id: string | null) => void

  // Sections/pages on islands
  sections: Section[]
  setSections: (sections: Section[]) => void
  activeSectionId: string | null
  setActiveSectionId: (id: string | null) => void

  // World interaction state
  isDragging: boolean
  setIsDragging: (dragging: boolean) => void
  worldRotation: [number, number, number]
  setWorldRotation: (rotation: [number, number, number]) => void

  // Helper functions
  getIslandById: (id: string) => Island | undefined
  getSectionById: (id: string) => Section | undefined
  getSectionsByIsland: (islandId: string) => Section[]
}

const WorldContext = createContext<WorldContextType | undefined>(undefined)

export function WorldProvider({ children }: { children: ReactNode }) {
  // Islands state
  const [islands, setIslands] = useState<Island[]>([
    { id: 'home', position: [0, 0, 0], name: 'Home', color: '#FF711E' },
    { id: 'projects', position: [10, 0, 0], name: 'Projects', color: '#4A90E2' },
    { id: 'about', position: [-10, 0, 0], name: 'About', color: '#50C878' },
  ])
  const [activeIslandId, setActiveIslandId] = useState<string | null>('home')

  // Sections state
  const [sections, setSections] = useState<Section[]>([
    { id: 'intro', islandId: 'home', name: 'Introduction', route: '/', angle: 0 },
    { id: 'skills', islandId: 'home', name: 'Skills', route: '/skills', angle: Math.PI / 2 },
    { id: 'project1', islandId: 'projects', name: 'Project 1', route: '/projects/1', angle: 0 },
    { id: 'project2', islandId: 'projects', name: 'Project 2', route: '/projects/2', angle: Math.PI },
  ])
  const [activeSectionId, setActiveSectionId] = useState<string | null>('intro')

  // World interaction
  const [isDragging, setIsDragging] = useState(false)
  const [worldRotation, setWorldRotation] = useState<[number, number, number]>([0, 0, 0])

  // Helper functions
  const getIslandById = (id: string) => islands.find(island => island.id === id)

  const getSectionById = (id: string) => sections.find(section => section.id === id)

  const getSectionsByIsland = (islandId: string) =>
    sections.filter(section => section.islandId === islandId)

  return (
    <WorldContext.Provider
      value={{
        islands,
        setIslands,
        activeIslandId,
        setActiveIslandId,
        sections,
        setSections,
        activeSectionId,
        setActiveSectionId,
        isDragging,
        setIsDragging,
        worldRotation,
        setWorldRotation,
        getIslandById,
        getSectionById,
        getSectionsByIsland,
      }}
    >
      {children}
    </WorldContext.Provider>
  )
}

export function useWorld() {
  const context = useContext(WorldContext)
  if (context === undefined) {
    throw new Error('useWorld must be used within a WorldProvider')
  }
  return context
}