# Lazy Sections Guide

## Overview

In addition to lazy-loading islands, you can now lazy-load **sections within islands** with their own independent load and active boundaries. This allows for fine-grained control over when content loads as users navigate through your portfolio.

## Why Lazy Sections?

**Use lazy sections when:**
- An island has multiple long sections of content (e.g., portfolio projects, blog posts)
- You want different sections to load at different distances/scroll depths
- Sections contain heavy content (images, 3D models, videos) that shouldn't all load at once
- You want to optimize initial island load time by deferring non-critical sections

**Example scenario:**
```
Home Island
├─ Hero Section (loads immediately)
├─ About Section (loads immediately)
├─ Projects Section (lazy, loads at scroll depth 800px) ← Lazy!
└─ Contact Section (lazy, loads at scroll depth 1600px) ← Lazy!
```

## Architecture

### How It Works

Sections work exactly like islands, but nested within them:

1. **Section Registry** ([sectionRegistry.ts](src/config/sectionRegistry.ts)) - Central config for all lazy sections
2. **BoundaryManager** - Extended to track section boundaries independently
3. **SectionLoader** - Handles lazy loading with Suspense (same pattern as IslandLoader)
4. **Position-based Loading** - Sections load based on camera proximity to their absolute world position

### Key Differences from Islands

| Feature | Islands | Sections |
|---------|---------|----------|
| **Parent** | None (top-level) | Must belong to an island |
| **Position** | Absolute in world | Absolute in world (not relative to island) |
| **Boundaries** | Own load/active radii | Own load/active radii (independent) |
| **Registry** | `ISLAND_REGISTRY` | `SECTION_REGISTRY` |
| **Loader** | `IslandLoader` | `SectionLoader` |
| **Console Logs** | 🌴 Island | 📄 Section |

## Implementation Guide

### Step 1: Create Your Section Component

```tsx
// src/island/home/sections/ProjectsSection.tsx
export function HomeProjectsSection() {
  return (
    <div className="home-projects-section">
      <h2>My Projects</h2>
      <div className="projects-grid">
        {/* Your heavy content here */}
      </div>
    </div>
  )
}
```

### Step 2: Create a Skeleton

```tsx
// src/island/home/sections/ProjectsSectionSkeleton.tsx
export function HomeProjectsSectionSkeleton() {
  return (
    <div className="home-projects-skeleton">
      <div className="skeleton-heading" />
      <div className="skeleton-grid">
        <div className="skeleton-card" />
        <div className="skeleton-card" />
        <div className="skeleton-card" />
      </div>
    </div>
  )
}
```

### Step 3: Add to Section Registry

```typescript
// src/config/sectionRegistry.ts
import { lazy } from 'react'
import { HomeProjectsSectionSkeleton } from '../island/home/sections/ProjectsSectionSkeleton'

const HomeProjectsSection = lazy(() =>
  import('../island/home/sections/ProjectsSection')
    .then(m => ({ default: m.HomeProjectsSection }))
)

export const SECTION_REGISTRY: Record<string, SectionConfig> = {
  'home-projects': {
    id: 'home-projects',
    islandId: 'home',
    name: 'Projects',
    position: [0, 1000, 0],  // 1000px down from world origin (not island origin!)
    boundaries: {
      loadRadius: 2000,     // Load when camera within 2000px
      activeRadius: 1000,   // Active when within 1000px
    },
    component: HomeProjectsSection,
    skeleton: HomeProjectsSectionSkeleton,
    lazy: true,  // IMPORTANT: Mark as lazy
  },
}
```

### Step 4: Use in Your Island

```tsx
// src/island/home/home.tsx
import { SectionLoader } from '../../components/loading/SectionLoader'
import { getLazySectionsForIsland } from '../../config/sectionRegistry'

export function HomeIsland() {
  const lazySections = getLazySectionsForIsland('home')

  return (
    <Island id="home" position={[0, 0, 0]} boundaries={{...}}>
      {/* Regular content */}
      <div className="home-hero">Hero Content</div>

      {/* Lazy sections */}
      {lazySections.map((sectionConfig) => (
        <SectionLoader key={sectionConfig.id} config={sectionConfig} />
      ))}
    </Island>
  )
}
```

## Position Modes

### Absolute Positioning (Default)

Positions are relative to the **world origin (0, 0, 0)**, not the island:

```typescript
{
  id: 'home-section2',
  islandId: 'home',
  position: [0, 800, 0],  // 800px down from world origin
  positionMode: 'absolute', // or omit (default)
}
```

**Use when:**
- You know the exact world coordinates
- Sections are laid out vertically in a predictable way
- You want fine control over positioning

### Relative Positioning (Future Feature - Not Yet Implemented)

Would position relative to parent island:

```typescript
{
  id: 'home-section2',
  islandId: 'home',  // Island at [0, 0, 0]
  position: [0, 800, 0],  // Would be [0, 800, 0] in world space
  positionMode: 'relative',
}
```

Currently, all positions are absolute. If you need relative positioning, calculate it manually:

```typescript
const islandPosition = [100, 200, 0]
const sectionOffset = [0, 800, 0]
const absolutePosition = [
  islandPosition[0] + sectionOffset[0],  // 100
  islandPosition[1] + sectionOffset[1],  // 1000
  islandPosition[2] + sectionOffset[2],  // 0
]
```

## Boundary Configuration

### Understanding Load vs Active Radii

```typescript
boundaries: {
  loadRadius: 2000,    // Outer boundary
  activeRadius: 1000,  // Inner boundary
}
```

**Load Radius (Outer Circle):**
- Triggers content loading
- Section becomes `isLoaded: true`
- Shows Suspense skeleton if not yet loaded

**Active Radius (Inner Circle):**
- Triggers "active" state
- Section becomes `isActive: true`
- Use for animations, expensive operations, etc.

**Preload Zone (2x Load Radius):**
- Automatically calculated as `loadRadius * 2`
- Starts background import
- Example: `loadRadius: 2000` → preload at `4000px`

### Choosing Radii Sizes

**For text-heavy sections:**
```typescript
boundaries: {
  loadRadius: 1500,   // Smaller radius, loads closer
  activeRadius: 800,
}
```

**For image/media sections:**
```typescript
boundaries: {
  loadRadius: 2500,   // Larger radius, more preload time
  activeRadius: 1200,
}
```

**For 3D/heavy sections:**
```typescript
boundaries: {
  loadRadius: 3000,   // Very large, loads early
  activeRadius: 1500,
}
```

## Console Logging

When sections load, you'll see these console messages:

```
✨ Preloading section "home-section2" (distance: 3800.00px, zoom: 1.00x)
📄 Section "home-section2" LOADING (distance: 1800.00px, zoom: 1.00x)
✨ Section "home-section2" ACTIVE (distance: 900.00px, zoom: 1.20x)
💤 Section "home-section2" INACTIVE (distance: 1100.00px, zoom: 0.90x)
📄 Section "home-section2" UNLOADING (distance: 2100.00px, zoom: 0.80x)
```

**Emoji key:**
- ✨ = Preloading (2x radius)
- 📄 = Loading/Unloading (1x radius)
- ✨ = Active (activeRadius)
- 💤 = Inactive (outside activeRadius)

## Dev Mode & Skeleton Preview

### Show All Section Skeletons

```
http://localhost:5175/?skeleton=true
```

Shows skeletons for ALL islands AND sections.

### Show Specific Section Skeletons

```
http://localhost:5175/?skeleton=home-section2
http://localhost:5175/?skeleton=home-section2,projects-gallery
```

Perfect for designing section skeletons without loading the actual content!

## Example: Complete Lazy Section

Here's the full example from the home island:

**Section Component:**
```tsx
// src/island/home/sections/Section2.tsx
export function HomeSection2() {
  return (
    <div className="home-section2">
      <h2>Section 2: Lazy Loaded Content</h2>
      <p>This section loads independently!</p>
    </div>
  )
}
```

**Skeleton:**
```tsx
// src/island/home/sections/Section2Skeleton.tsx
export function HomeSection2Skeleton() {
  return (
    <div className="home-section2-skeleton">
      <div className="skeleton-heading" />
      <div className="skeleton-line" />
      <div className="skeleton-line" />
    </div>
  )
}
```

**Registry Entry:**
```typescript
// src/config/sectionRegistry.ts
const HomeSection2 = lazy(() =>
  import('../island/home/sections/Section2')
    .then(m => ({ default: m.HomeSection2 }))
)

export const SECTION_REGISTRY = {
  'home-section2': {
    id: 'home-section2',
    islandId: 'home',
    name: 'Section 2',
    position: [0, 800, 0],
    boundaries: {
      loadRadius: 2000,
      activeRadius: 1000,
    },
    component: HomeSection2,
    skeleton: HomeSection2Skeleton,
    lazy: true,
  },
}
```

**Island Usage:**
```tsx
// src/island/home/home.tsx
import { SectionLoader } from '../../components/loading/SectionLoader'
import { getLazySectionsForIsland } from '../../config/sectionRegistry'

export function HomeIsland() {
  const lazySections = getLazySectionsForIsland('home')

  return (
    <Island id="home" position={[0, 0, 0]} boundaries={{...}}>
      <div className="hero">Hero</div>

      {/* Renders home-section2 with its own boundaries */}
      {lazySections.map((config) => (
        <SectionLoader key={config.id} config={config} />
      ))}
    </Island>
  )
}
```

## Performance Considerations

### Code Splitting

Each lazy section becomes its own chunk:

```
dist/
├── home-island-[hash].js     # Main island
├── section2-[hash].js         # Lazy section 1
└── projects-[hash].js         # Lazy section 2
```

**Benefits:**
- Faster initial island load
- Sections load on-demand
- Better cache granularity

### When NOT to Use Lazy Sections

❌ **Don't lazy-load:**
- Hero sections (should load with island)
- Critical above-the-fold content
- Very small sections (<50KB)
- Sections that are always visible

✅ **Do lazy-load:**
- Below-the-fold content
- Heavy media galleries
- Long-form content
- 3D/interactive elements

## Reactive Boundary States

You can react to section boundary states in your components:

```tsx
import { useSectionBoundaryState } from '../../context/BoundaryContext'

export function HomeSection2() {
  const boundaryState = useSectionBoundaryState('home-section2')

  return (
    <div className={boundaryState.isActive ? 'active' : 'inactive'}>
      {boundaryState.isActive && <ExpensiveAnimation />}
      {/* Content */}
    </div>
  )
}
```

**Available state:**
```typescript
{
  isLoaded: boolean        // Within load radius?
  isActive: boolean        // Within active radius?
  distanceToCamera: number // Exact distance in px
}
```

## Troubleshooting

### Section Not Loading

**Check:**
1. Is `lazy: true` set in config?
2. Is position correct? (Use browser console logs)
3. Is section registered in `SECTION_REGISTRY`?
4. Did you add it to the island via `getLazySectionsForIsland()`?

### Skeleton Not Showing

**Check:**
1. Is skeleton component imported correctly?
2. Is skeleton exported as named export?
3. Does lazy import path match file structure?

### Multiple Sections Loading at Once

This is normal if they have overlapping boundaries. Adjust `loadRadius` to stagger loading:

```typescript
// Section 1 loads first
{ loadRadius: 1500 }

// Section 2 loads later
{ loadRadius: 1500, position: [0, 1000, 0] }

// Section 3 loads last
{ loadRadius: 1500, position: [0, 2000, 0] }
```

## Advanced: Programmatic Section Loading

You can also use `SectionLoader` directly without the registry:

```tsx
<SectionLoader
  config={{
    id: 'custom-section',
    islandId: 'home',
    name: 'Custom',
    position: [0, 1200, 0],
    boundaries: { loadRadius: 2000, activeRadius: 1000 },
    component: MySection,
    skeleton: MySkeleton,
    lazy: true,
  }}
/>
```

But using the registry is recommended for consistency.

## File Structure

```
src/
├── config/
│   └── sectionRegistry.ts              # Central section config
├── components/
│   ├── boundary/
│   │   ├── BoundaryManager.ts          # Handles island + section boundaries
│   │   └── boundary.ts                 # Type definitions
│   └── loading/
│       ├── SectionLoader.tsx           # Lazy section loader
│       ├── SectionSkeleton.tsx         # Base skeleton
│       └── SectionSkeleton.scss        # Skeleton styles
└── island/
    └── home/
        ├── home.tsx                     # Uses SectionLoader
        └── sections/
            ├── Section2.tsx             # Lazy section
            ├── Section2Skeleton.tsx     # Custom skeleton
            └── Section2Skeleton.scss    # Skeleton styles
```

## Summary

Lazy sections extend the island loading system to provide:
- ✅ Fine-grained control over content loading
- ✅ Independent boundaries per section
- ✅ Better performance for content-heavy islands
- ✅ Same preloading benefits as islands (2x radius)
- ✅ Dev mode skeleton preview
- ✅ Reactive boundary states

Now you can optimize not just which islands load, but which sections within those islands load, giving you complete control over your portfolio's loading experience!
