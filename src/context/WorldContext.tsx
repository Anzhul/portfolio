import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import type { ReactNode } from 'react'

// World state provider - manages 3D world state, islands, sections, pages, and navigation
// URL structure: /island/section or /island/page or /island (when zoomed out)
// Components register themselves when mounted using <Island>, <Section>, <Page> components

export interface PageData {
  id: string
  islandId: string
  name: string
  content: string
  description?: string
}

export interface SectionData {
  id: string
  islandId: string
  name: string
  position: [number, number, number]  // Position in 3D space (x, y, z)
  description?: string
}

export interface IslandData {
  id: string
  position: [number, number, number]
  name: string
}

type ViewMode = 'world' | 'island' | 'section' | 'page'

interface WorldContextType {
  // Registration functions
  registerIsland: (island: IslandData) => void
  unregisterIsland: (id: string) => void
  registerSection: (section: SectionData) => void
  unregisterSection: (islandId: string, sectionId: string) => void
  registerPage: (page: PageData) => void
  unregisterPage: (islandId: string, pageId: string) => void

  // Registered data
  islands: Map<string, IslandData>
  sections: Map<string, SectionData[]>
  pages: Map<string, PageData[]>

  // Navigation state
  activeIslandId: string | null
  setActiveIslandId: (id: string | null) => void
  activeSectionId: string | null
  setActiveSectionId: (id: string | null) => void
  activePageId: string | null
  setActivePageId: (id: string | null) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // Helper functions
  getIslandById: (id: string) => IslandData | undefined
  getSectionById: (islandId: string, sectionId: string) => SectionData | undefined
  getPageById: (islandId: string, pageId: string) => PageData | undefined
  getSectionsByIsland: (islandId: string) => SectionData[]
  getPagesByIsland: (islandId: string) => PageData[]

  // URL/Route helpers
  navigateToIsland: (islandId: string) => void
  navigateToSection: (islandId: string, sectionId: string) => void
  navigateToPage: (islandId: string, pageId: string) => void
  getCurrentRoute: () => string
}

const WorldContext = createContext<WorldContextType | undefined>(undefined)

export function WorldProvider({ children }: { children: ReactNode }) {
  // Registration maps
  const [islands, setIslands] = useState<Map<string, IslandData>>(new Map())
  const [sections, setSections] = useState<Map<string, SectionData[]>>(new Map())
  const [pages, setPages] = useState<Map<string, PageData[]>>(new Map())

  // Navigation state
  const [activeIslandId, setActiveIslandId] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [activePageId, setActivePageId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('world')

  // Registration functions - wrapped in useCallback to prevent infinite loops
  const registerIsland = useCallback((island: IslandData) => {
    setIslands((prev) => new Map(prev).set(island.id, island))
  }, [])

  const unregisterIsland = useCallback((id: string) => {
    setIslands((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  const registerSection = useCallback((section: SectionData) => {
    setSections((prev) => {
      const next = new Map(prev)
      const existing = next.get(section.islandId) || []
      next.set(section.islandId, [...existing.filter((s) => s.id !== section.id), section])
      return next
    })
  }, [])

  const unregisterSection = useCallback((islandId: string, sectionId: string) => {
    setSections((prev) => {
      const next = new Map(prev)
      const existing = next.get(islandId) || []
      next.set(
        islandId,
        existing.filter((s) => s.id !== sectionId)
      )
      return next
    })
  }, [])

  const registerPage = useCallback((page: PageData) => {
    setPages((prev) => {
      const next = new Map(prev)
      const existing = next.get(page.islandId) || []
      next.set(page.islandId, [...existing.filter((p) => p.id !== page.id), page])
      return next
    })
  }, [])

  const unregisterPage = useCallback((islandId: string, pageId: string) => {
    setPages((prev) => {
      const next = new Map(prev)
      const existing = next.get(islandId) || []
      next.set(
        islandId,
        existing.filter((p) => p.id !== pageId)
      )
      return next
    })
  }, [])

  // Helper functions
  const getIslandById = useCallback((id: string) => islands.get(id), [islands])

  const getSectionById = useCallback((islandId: string, sectionId: string) => {
    const islandSections = sections.get(islandId) || []
    return islandSections.find((section) => section.id === sectionId)
  }, [sections])

  const getPageById = useCallback((islandId: string, pageId: string) => {
    const islandPages = pages.get(islandId) || []
    return islandPages.find((page) => page.id === pageId)
  }, [pages])

  const getSectionsByIsland = useCallback((islandId: string) => {
    return sections.get(islandId) || []
  }, [sections])

  const getPagesByIsland = useCallback((islandId: string) => {
    return pages.get(islandId) || []
  }, [pages])

  // Navigation helpers
  const navigateToIsland = useCallback((islandId: string) => {
    setActiveIslandId(islandId)
    setActiveSectionId(null)
    setActivePageId(null)
    setViewMode('island')
  }, [])

  const navigateToSection = useCallback((islandId: string, sectionId: string) => {
    setActiveIslandId(islandId)
    setActiveSectionId(sectionId)
    setActivePageId(null)
    setViewMode('section')
  }, [])

  const navigateToPage = useCallback((islandId: string, pageId: string) => {
    setActiveIslandId(islandId)
    setActivePageId(pageId)
    setActiveSectionId(null)
    setViewMode('page')
  }, [])

  const getCurrentRoute = useCallback(() => {
    if (!activeIslandId) return '/'
    if (activeSectionId) return `/${activeIslandId}/${activeSectionId}`
    if (activePageId) return `/${activeIslandId}/${activePageId}`
    return `/${activeIslandId}`
  }, [activeIslandId, activeSectionId, activePageId])

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    registerIsland,
    unregisterIsland,
    registerSection,
    unregisterSection,
    registerPage,
    unregisterPage,
    islands,
    sections,
    pages,
    activeIslandId,
    setActiveIslandId,
    activeSectionId,
    setActiveSectionId,
    activePageId,
    setActivePageId,
    viewMode,
    setViewMode,
    getIslandById,
    getSectionById,
    getPageById,
    getSectionsByIsland,
    getPagesByIsland,
    navigateToIsland,
    navigateToSection,
    navigateToPage,
    getCurrentRoute,
  }), [
    registerIsland,
    unregisterIsland,
    registerSection,
    unregisterSection,
    registerPage,
    unregisterPage,
    islands,
    sections,
    pages,
    activeIslandId,
    activeSectionId,
    activePageId,
    viewMode,
    getIslandById,
    getSectionById,
    getPageById,
    getSectionsByIsland,
    getPagesByIsland,
    navigateToIsland,
    navigateToSection,
    navigateToPage,
    getCurrentRoute,
  ])

  return (
    <WorldContext.Provider value={contextValue}>
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