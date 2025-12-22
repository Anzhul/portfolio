# Async Loading Architecture

This document describes the new async loading system for islands in the portfolio application.

## Overview

The application now uses a lazy-loading strategy where:
- **Core infrastructure** (navigation, world, camera, boundary manager) loads immediately
- **Island content** loads asynchronously based on camera proximity
- **Home island** loads immediately since it's the starting position
- **Other islands** preload at 2x their load radius for zero-latency loading
- **Custom skeletons** show while islands are loading

## Architecture Components

### 1. Island Registry ([islandRegistry.ts](src/config/islandRegistry.ts))

Central configuration for all islands with:
- Island metadata (id, position, name, boundaries)
- Lazy-loaded island components
- Skeleton components (loaded immediately)
- `loadImmediately` flag for home island

**Adding a new island:**

```typescript
// 1. Create your island component
// src/island/projects/projects.tsx
export function ProjectsIsland() {
  return (
    <Island id="projects" position={[5000, 0, 0]} ...>
      {/* Your content */}
    </Island>
  )
}

// 2. Create a skeleton component
// src/island/projects/ProjectsIslandSkeleton.tsx
export function ProjectsIslandSkeleton() {
  return <div className="projects-skeleton">...</div>
}

// 3. Add to registry
import { lazy } from 'react'
import { ProjectsIslandSkeleton } from '../island/projects/ProjectsIslandSkeleton'

const ProjectsIsland = lazy(() =>
  import('../island/projects/projects').then(m => ({ default: m.ProjectsIsland }))
)

export const ISLAND_REGISTRY = {
  // ... home island
  projects: {
    id: 'projects',
    position: [5000, 0, 0],
    name: 'Projects',
    boundaries: {
      loadRadius: 3000,
      activeRadius: 1600,
    },
    component: ProjectsIsland,
    skeleton: ProjectsIslandSkeleton,
  },
}
```

### 2. BoundaryManager Enhancements ([BoundaryManager.ts](src/components/boundary/BoundaryManager.ts))

Added preload zone detection:

- **Preload Zone:** 2x the `loadRadius` (e.g., 6000px for a 3000px load radius)
- **When camera enters preload zone:** Triggers preload callback to start async import
- **One-time preload:** Each island preloads only once, then removes the callback

**New methods:**
- `registerPreload(islandId, callback)` - Register preload handler
- `isPreloaded(islandId)` - Check if island has been preloaded

**Console logs:**
```
✨ Preloading island "projects" (distance: 5500.00px, zoom: 1.00x)
🌴 Island "projects" LOADING (distance: 2800.00px, zoom: 1.00x)
⚡ Island "projects" ACTIVE (distance: 0.00px, zoom: 1.00x)
```

### 3. IslandLoader Component ([IslandLoader.tsx](src/components/loading/IslandLoader.tsx))

Handles the complete loading lifecycle:

**Loading Flow:**
1. **Mount:** Registers island metadata with BoundaryManager
2. **Preload Zone (2x radius):** Starts background import
3. **Load Zone (1x radius):** Shows Suspense skeleton if not yet loaded
4. **Loaded:** Renders actual island content
5. **Islands stay mounted** even when far away (no unloading)

**Special handling for home island:**
- `loadImmediately: true` bypasses preload logic
- Renders immediately on app start

### 4. Skeleton Components

**Base Skeleton ([IslandSkeleton.tsx](src/components/loading/IslandSkeleton.tsx)):**
- Generic skeleton with shimmer animation
- Can be used as-is for simple islands

**Custom Skeletons:**
- [HomeIslandSkeleton.tsx](src/island/home/HomeIslandSkeleton.tsx) - Custom skeleton matching home layout
- Create one per island for better UX

**Skeleton Features:**
- Shimmer animation with gradient sweep
- Pulse animation for breathing effect
- Lightweight (no heavy dependencies)
- Matches island layout for smooth transition

### 5. Updated App.tsx

**Before (synchronous):**
```tsx
<World>
  <HomeIsland />
</World>
```

**After (async):**
```tsx
<World>
  {Object.values(ISLAND_REGISTRY).map((config) => (
    <IslandLoader key={config.id} config={config} />
  ))}
</World>
```

## Loading Behavior

### Scenario 1: App Startup (Home Island)
1. App initializes providers
2. BoundaryManager created
3. Home island metadata registered
4. Home island component loads immediately (`loadImmediately: true`)
5. Shows skeleton during Suspense loading
6. Renders home island content

### Scenario 2: Navigating to New Island
1. User pans camera toward "Projects" island (5000px away)
2. **At distance 6000px (2x loadRadius):**
   - ✨ Preload callback triggered
   - Background import starts: `import('../island/projects/projects')`
3. **At distance 3000px (1x loadRadius):**
   - Island enters "LOADING" state
   - If import complete: Renders immediately
   - If still loading: Shows skeleton in Suspense boundary
4. **At distance 1600px (activeRadius):**
   - ⚡ Island becomes "ACTIVE"
   - Animations and heavy interactions enabled
5. **Moving away:**
   - Island stays mounted (no unloading)
   - Boundary states update but content persists

### Scenario 3: Rapid Camera Movement
1. Camera zooms out and pans quickly
2. Multiple islands enter preload zone simultaneously
3. All islands start preloading in parallel
4. Each loads independently as needed
5. No duplicate imports (tracked by `preloadedIslands` set)

## Performance Benefits

### Code Splitting
- Each island is a separate chunk: `home-[hash].js`, `projects-[hash].js`
- Vite automatically handles code splitting via `lazy()`
- Initial bundle only includes core infrastructure + home island

### Preloading Strategy
- **2x loadRadius = ~6000px** for most islands
- At typical zoom levels, this provides 2-3 seconds of preload time
- Results in **zero perceived loading time** for users navigating normally

### Memory Management
- Islands stay mounted after loading (per requirements)
- Acceptable for portfolio with ~5-10 islands
- Future optimization: Add unload logic if memory becomes an issue

## Testing the System

### 1. Check Initial Load
- Open browser dev tools → Network tab
- Refresh page
- Should see: `home-[hash].js` loads immediately
- Other island chunks should NOT load yet

### 2. Test Preloading
- Open browser console
- Pan camera toward another island
- Watch for: `✨ Preloading island "projects"` at ~6000px distance
- Network tab: Island chunk starts loading

### 3. Test Loading States
- Throttle network to "Slow 3G" in dev tools
- Pan to new island
- Should see skeleton → content transition

### 4. Verify Boundary States
Console logs show transitions:
```
✨ Preloading island "projects" (distance: 5500px, zoom: 1.00x)
🌴 Island "projects" LOADING (distance: 2800px, zoom: 1.00x)
⚡ Island "projects" ACTIVE (distance: 100px, zoom: 1.00x)
💤 Island "projects" INACTIVE (distance: 1700px, zoom: 0.80x)
```

## Customization Guide

### Adjusting Preload Distance
In [BoundaryManager.ts:129](src/components/boundary/BoundaryManager.ts#L129):
```typescript
const preloadRadius = scaledLoadRadius * 2;  // Change multiplier here
```

### Creating Custom Skeletons
1. Copy [HomeIslandSkeleton.tsx](src/island/home/HomeIslandSkeleton.tsx)
2. Match your island's layout
3. Use skeleton utilities from [IslandSkeleton.scss](src/components/loading/IslandSkeleton.scss)

### Disabling Preload for an Island
Set preload to 1x (same as load radius):
```typescript
const preloadRadius = scaledLoadRadius * 1;  // No preloading, loads on-demand
```

## File Structure

```
src/
├── config/
│   └── islandRegistry.ts              # Central island configuration
├── components/
│   ├── boundary/
│   │   ├── BoundaryManager.ts         # Enhanced with preload zones
│   │   └── boundary.ts                # Type definitions
│   ├── loading/
│   │   ├── IslandLoader.tsx           # Lazy loading + Suspense handler
│   │   ├── IslandSkeleton.tsx         # Base skeleton component
│   │   └── IslandSkeleton.scss        # Skeleton animations
├── island/
│   └── home/
│       ├── home.tsx                   # Home island (lazy-loaded)
│       ├── HomeIslandSkeleton.tsx     # Custom skeleton
│       └── HomeIslandSkeleton.scss    # Custom skeleton styles
└── App.tsx                             # Updated to use IslandLoader
```

## Migration Notes

### Old Pattern (Manual)
```tsx
// App.tsx
<World>
  <HomeIsland />
  <ProjectsIsland />
  <AboutIsland />
</World>
```

### New Pattern (Registry)
```tsx
// App.tsx
<World>
  {Object.values(ISLAND_REGISTRY).map((config) => (
    <IslandLoader key={config.id} config={config} />
  ))}
</World>

// islandRegistry.ts
export const ISLAND_REGISTRY = {
  home: { ... },
  projects: { ... },
  about: { ... },
}
```

## Future Enhancements

### Optional: Unload Distant Islands
Add distance-based unloading in [IslandLoader.tsx](src/components/loading/IslandLoader.tsx):
```typescript
const UNLOAD_DISTANCE = 10000; // Very far away

if (boundaryState.distanceToCamera > UNLOAD_DISTANCE && !config.loadImmediately) {
  return <SkeletonComponent />; // Unmount island to free memory
}
```

### Optional: Progressive Loading for Sections
Apply same pattern to sections within islands:
```typescript
const Section1 = lazy(() => import('./sections/Section1'))

// In island component:
<Suspense fallback={<SectionSkeleton />}>
  <Section1 />
</Suspense>
```

### Optional: Analytics
Track loading performance:
```typescript
manager.registerPreload(islandId, () => {
  const startTime = performance.now();
  import(`../island/${islandId}`).then(() => {
    console.log(`Island ${islandId} loaded in ${performance.now() - startTime}ms`);
  });
});
```

## Troubleshooting

### Island doesn't load
- Check: Is it registered in `ISLAND_REGISTRY`?
- Check: Is the lazy import path correct?
- Check: Are boundaries configured properly?

### Skeleton doesn't show
- Check: Is skeleton component exported correctly?
- Check: Import path in registry matches file location

### Preload not triggering
- Check: `loadImmediately` should be `false` or undefined
- Check: Camera is entering 2x loadRadius zone
- Check: Console for `✨ Preloading` message

### TypeScript errors
- Ensure island component is exported: `export function HomeIsland()`
- Match export name in lazy import: `.then(m => ({ default: m.HomeIsland }))`
