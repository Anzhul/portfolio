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

// Eagerly imported island components — chunks are tiny (~4KB total)
// so the lazy loading overhead (network latency + Suspense re-render)
// costs more than just bundling them
import { TheHillIsland } from '../island/home/the_hill'
import { TheStudioIsland } from '../island/about/the_studio'
import { InTheDesertIsland } from '../island/desert/in_the_desert'

// Skeleton components (lightweight placeholders)
import { TheHillIslandSkeleton } from '../island/home/TheHillIslandSkeleton'
import { TheStudioIslandSkeleton } from '../island/about/TheStudioIslandSkeleton'
import { InTheDesertIslandSkeleton } from '../island/desert/InTheDesertIslandSkeleton'

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
  },

  in_the_desert: {
    id: 'in_the_desert',
    position: [8000, 0, 0],
    name: 'in the desert',
    boundaries: {
      loadRadius: 5000,
      activeRadius: 3400,
    },
    component: InTheDesertIsland,
    skeleton: InTheDesertIslandSkeleton,
  },
}
