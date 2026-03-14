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
import { InTheDesertIsland } from '../island/desert/in_the_desert'

// Skeleton components (lightweight placeholders)
import { TheHillIslandSkeleton } from '../island/home/TheHillIslandSkeleton'
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
    subGroup: 'about',
    // loadImmediately: true,  // Disabled - home island now lazy loads like others
  },

  in_the_desert: {
    id: 'in_the_desert',
    position: [8000, 0, 0],
    name: 'in the desert',
    boundaries: {
      loadRadius: 12000,
      activeRadius: 9000,
    },
    component: InTheDesertIsland,
    skeleton: InTheDesertIslandSkeleton,
    subGroup: 'work'
  },
}
