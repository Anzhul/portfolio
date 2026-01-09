import { lazy } from 'react'
import type { ComponentType } from 'react'
import type { BoundaryConfig } from '../context/BoundaryContext'

export interface IslandConfig {
  id: string
  position: [number, number, number]
  name: string
  boundaries: BoundaryConfig
  component: ComponentType
  skeleton: ComponentType
  subGroup?: string
  loadImmediately?: boolean  // For home island
}

// Lazy-loaded island components
const TheHillIsland = lazy(() => import('../island/home/the_hill').then(m => ({ default: m.TheHillIsland })))
const TheStudioIsland = lazy(() => import('../island/about/the_studio').then(m => ({ default: m.TheStudioIsland })))
// Add more islands here as you create them:
// const ProjectsIsland = lazy(() => import('../island/projects/projects').then(m => ({ default: m.ProjectsIsland })))

// Skeleton components (loaded immediately, lightweight)
import { TheHillIslandSkeleton } from '../island/home/TheHillIslandSkeleton'
import { TheStudioIslandSkeleton } from '../island/about/TheStudioIslandSkeleton'
// Import more skeletons here:
// import { ProjectsIslandSkeleton } from '../island/projects/ProjectsIslandSkeleton'

export const ISLAND_REGISTRY: Record<string, IslandConfig> = {
  the_hill: {
    id: 'the_hill',
    position: [0, 0, 0],
    name: 'the hill',
    boundaries: {
      loadRadius: 3000,
      activeRadius: 1600,
    },
    component: TheHillIsland,
    skeleton: TheHillIslandSkeleton,
    subGroup: 'about'
    // loadImmediately: true,  // Disabled - home island now lazy loads like others
  },

  the_studio: {
    id: 'the_studio',
    position: [4000, 4000, 0],
    name: 'the studio',
    boundaries: {
      loadRadius: 3000,
      activeRadius: 1600,
    },
    component: TheStudioIsland,
    skeleton: TheStudioIslandSkeleton,
    subGroup: 'about'
  }
  // Add more islands here:
  // projects: {
  //   id: 'projects',
  //   position: [5000, 0, 0],
  //   name: 'Projects',
  //   boundaries: {
  //     loadRadius: 3000,
  //     activeRadius: 1600,
  //   },
  //   component: ProjectsIsland,
  //   skeleton: ProjectsIslandSkeleton,
  // },
}
