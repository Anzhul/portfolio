// import { lazy } from 'react'
import type { ComponentType } from 'react'
import type { BoundaryConfig } from '../context/BoundaryContext'
// import { HomeSection2Skeleton } from '../island/home/sections/Section2Skeleton'

// Lazy-loaded sections
// const HomeSection2 = lazy(() => import('../island/home/sections/Section2').then(m => ({ default: m.HomeSection2 })))

export interface SectionConfig {
  id: string
  islandId: string  // Parent island
  position: [number, number, number]  // Relative to island or absolute
  positionMode?: 'relative' | 'absolute'  // Default: absolute
  name: string
  boundaries: BoundaryConfig
  component: ComponentType
  skeleton: ComponentType
  lazy?: boolean  // If true, section lazy loads with boundaries
}

/**
 * Registry for lazy-loaded sections
 * Sections registered here will have their own load/active boundaries
 *
 * Example:
 * const HomeSection1 = lazy(() => import('../island/home/sections/Section1'))
 *
 * export const SECTION_REGISTRY = {
 *   'home-section1': {
 *     id: 'home-section1',
 *     islandId: 'home',
 *     position: [0, 1000, 0],
 *     boundaries: {
 *       loadRadius: 2000,
 *       activeRadius: 1000,
 *     },
 *     component: HomeSection1,
 *     skeleton: HomeSection1Skeleton,
 *     lazy: true,
 *   }
 * }
 */


export const SECTION_REGISTRY: Record<string, SectionConfig> = {/*
  'home-section2': {
    id: 'home-section2',
    islandId: 'home',
    name: 'Section 2',
    position: [1200, 1200, 0],  // 800px down from home island origin
    boundaries: {
      loadRadius: 2000,
      activeRadius: 1000,
    },
    component: HomeSection2,
    skeleton: HomeSection2Skeleton,
    lazy: true,
  },
  */
  // Add more lazy sections here
}

/**
 * Get all sections for a specific island
 */
export function getSectionsForIsland(islandId: string): SectionConfig[] {
  return Object.values(SECTION_REGISTRY).filter(
    section => section.islandId === islandId
  )
}

/**
 * Get lazy sections for a specific island
 */
export function getLazySectionsForIsland(islandId: string): SectionConfig[] {
  return Object.values(SECTION_REGISTRY).filter(
    section => section.islandId === islandId && section.lazy
  )
}