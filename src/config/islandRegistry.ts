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
  loadImmediately?: boolean  // For home island
}

// Lazy-loaded island components
const HomeIsland = lazy(() => import('../island/home/home').then(m => ({ default: m.HomeIsland })))
const AboutIsland = lazy(() => import('../island/about/about').then(m => ({ default: m.AboutIsland })))
// Add more islands here as you create them:
// const ProjectsIsland = lazy(() => import('../island/projects/projects').then(m => ({ default: m.ProjectsIsland })))
// const AboutIsland = lazy(() => import('../island/about/about').then(m => ({ default: m.AboutIsland })))

// Skeleton components (loaded immediately, lightweight)
import { HomeIslandSkeleton } from '../island/home/HomeIslandSkeleton'
import { AboutIslandSkeleton } from '../island/about/AboutIslandSkeleton'
// Import more skeletons here:
// import { ProjectsIslandSkeleton } from '../island/projects/ProjectsIslandSkeleton'
// import { AboutIslandSkeleton } from '../island/about/AboutIslandSkeleton'

export const ISLAND_REGISTRY: Record<string, IslandConfig> = {
  home: {
    id: 'home',
    position: [0, 0, 0],
    name: 'home',
    boundaries: {
      loadRadius: 3000,
      activeRadius: 1600,
    },
    component: HomeIsland,
    skeleton: HomeIslandSkeleton,
    // loadImmediately: true,  // Disabled - home island now lazy loads like others
  },

  about: {
    id: 'about',
    position: [4000, 4000, 0],
    name: 'about',
    boundaries: {
      loadRadius: 3000,
      activeRadius: 1600,
    },
    component: AboutIsland,
    skeleton: AboutIslandSkeleton,
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
