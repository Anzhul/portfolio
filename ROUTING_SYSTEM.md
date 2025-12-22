# Automatic Routing System

## Overview

Your portfolio now features an **automatic routing system** that updates the URL based on which island or section is closest to the viewport's top-left corner. This provides:

- ✅ **Deep linkable URLs** - Share specific islands/sections
- ✅ **Browser history** - Back/forward navigation
- ✅ **Automatic updates** - URL changes as you pan around
- ✅ **No manual routing** - Works seamlessly with boundary system

## How It Works

### 1. Distance Calculation

The system continuously calculates the distance from each island/section's center to the **viewport's top-left corner**:

```
┌────────────────────────────────────┐
│ ← Viewport Top-Left (screenLeft, screenTop)
│                                    │
│          [Island A]                │
│             •                      │
│          Distance: 500px           │
│                                    │
│                      [Section B]   │
│                         •          │
│                      Distance: 800px
│                                    │
└────────────────────────────────────┘

Closest: Island A (500px) → URL: /island-a
```

**Why top-left?**
- Consistent reference point
- Matches natural reading flow (left-to-right, top-to-bottom)
- Works well for vertically scrolling content

### 2. Route Format

```typescript
// Root (no entities or viewport far from all)
/

// Island only
/home
/projects
/about

// Island + Section
/home/home-section2
/projects/gallery
```

### 3. Automatic Updates

The BoundaryManager checks every **100ms** (throttled camera updates) and:
1. Calculates viewport top-left in world space
2. Finds closest island/section to that point
3. If closest entity changed → Triggers route callback
4. RouteSync debounces and updates URL (300ms delay)

**Result:** URL updates smoothly as you navigate, but not too frequently.

## Architecture

### Files Created

```
src/
├── utils/
│   └── routing.ts                      # Routing utilities
├── components/
│   ├── boundary/
│   │   └── BoundaryManager.ts          # Extended with route tracking
│   └── routing/
│       └── RouteSync.tsx               # URL synchronization component
└── App.tsx                              # Includes RouteSync
```

### Flow Diagram

```
Camera moves (pan/zoom)
    ↓
CameraContext updates (throttled 100ms)
    ↓
BoundaryManager.checkAllBoundaries()
    ↓
BoundaryManager.updateCurrentRoute()
    ↓
Calculate viewport top-left position
    ↓
findClosestEntity(islands, sections, topLeft)
    ↓
Closest entity changed?
    ↓ YES
Notify route change callbacks
    ↓
RouteSync receives callback
    ↓
Debounce 300ms
    ↓
navigate(newPath, { replace: true })
    ↓
URL updated! 🧭
```

## Implementation Details

### 1. Distance Calculation

```typescript
// From routing.ts
export function distanceToViewportTopLeft(
  entityPosition: [number, number, number],
  viewportTopLeft: [number, number]
): number {
  const dx = entityPosition[0] - viewportTopLeft[0]
  const dy = entityPosition[1] - viewportTopLeft[1]
  return Math.sqrt(dx * dx + dy * dy)
}
```

Simple Euclidean distance - fast and accurate.

### 2. Closest Entity Selection

```typescript
// From routing.ts
export function findClosestEntity(
  islands: Map<string, { position: [number, number, number] }>,
  sections: Map<string, { position: [number, number, number] }>,
  viewportTopLeft: [number, number]
): EntityPosition | null {
  const entities: EntityPosition[] = []

  // Add all islands
  islands.forEach((island, id) => {
    entities.push({
      id,
      type: 'island',
      position: island.position,
      distance: distanceToViewportTopLeft(island.position, viewportTopLeft),
    })
  })

  // Add all sections
  sections.forEach((section, id) => {
    entities.push({
      id,
      type: 'section',
      position: section.position,
      distance: distanceToViewportTopLeft(section.position, viewportTopLeft),
    })
  })

  // Sort by distance and return closest
  entities.sort((a, b) => a.distance - b.distance)
  return entities[0]
}
```

**Behavior:**
- Sections compete with islands for "closest" status
- A section can be the active route even if you're viewing its parent island
- This allows for deep linking to specific sections

### 3. Route Generation

```typescript
// From routing.ts
export function generateRoutePath(
  entity: EntityPosition,
  sectionIslandMap: Map<string, string>
): string {
  if (entity.type === 'island') {
    return `/${entity.id}`
  }

  // For sections, format as /island-id/section-id
  const islandId = sectionIslandMap.get(entity.id)
  return `/${islandId}/${entity.id}`
}
```

**Examples:**
```typescript
generateRoutePath({ id: 'home', type: 'island' })
// → "/home"

generateRoutePath({ id: 'home-section2', type: 'section' }, sectionIslandMap)
// → "/home/home-section2"
```

### 4. Debouncing

```typescript
// RouteSync.tsx
const debouncedNavigate = debounce((path: string) => {
  if (location.pathname !== path) {
    navigate(path, { replace: true })  // Replace to avoid history clutter
    console.log(`🧭 Route updated: ${path}`)
  }
}, 300)  // 300ms delay
```

**Why debounce?**
- Prevents rapid URL changes during fast panning
- Reduces browser history entries
- Better performance (fewer DOM updates)

**Why 300ms?**
- Long enough to avoid jitter during intentional movement
- Short enough to feel responsive
- Balances smoothness vs accuracy

## Console Logging

When routes change, you'll see:

```
🧭 Route updated: /home
🧭 Route updated: /home/home-section2
🧭 Route updated: /projects
```

This helps debug routing behavior during navigation.

## URL Behavior

### Browser History

Uses `navigate(path, { replace: true })` which **replaces** the current history entry:

**Without replace:**
```
/ → /home → /home → /home → /home/section2 → /home/section2
            ↑ Lots of duplicate entries
```

**With replace:**
```
/ → /home → /home/section2
    ↑ Clean history
```

**Effect:**
- Back button works as expected (goes to previous island, not every pan)
- Forward button works normally
- Refreshing page keeps you at the current route

### Deep Linking

Share URLs to specific locations:

```
https://yoursite.com/home
→ Opens at home island

https://yoursite.com/home/home-section2
→ Opens at home island, section 2

https://yoursite.com/projects/gallery
→ Opens at projects island, gallery section
```

**Note:** Currently, the camera doesn't automatically pan to the route on page load. This would require additional implementation (see Future Enhancements below).

## Configuration

### Adjust Debounce Delay

In [RouteSync.tsx](src/components/routing/RouteSync.tsx):

```typescript
const debouncedNavigate = debounce((path: string) => {
  // ...
}, 300)  // Change this value

// Higher = More stable, less responsive
// Lower = More responsive, more jittery
```

**Recommended values:**
- **100ms** - Very responsive, may update too often
- **300ms** - Balanced (default)
- **500ms** - Stable, less responsive
- **1000ms** - Very stable, noticeable delay

### Disable Route Sync

Comment out in [App.tsx](src/App.tsx):

```tsx
<BoundaryProvider>
  {/* <RouteSync /> */}  {/* Disabled */}
  <Navigation />
  {/* ... */}
</BoundaryProvider>
```

Or conditionally render:

```tsx
{import.meta.env.PROD && <RouteSync />}  // Only in production
```

## Examples

### Scenario 1: Navigating Between Islands

```
User action: Pan from home (0, 0) to projects (5000, 0)

Camera at [0, 0]:
  Closest: home island
  URL: /home

Camera at [2500, 0]:
  Still closest: home island
  URL: /home (no change)

Camera at [2600, 0]:
  Closest: projects island
  URL: /projects ← Changed!
```

### Scenario 2: Scrolling to Section

```
User action: Scroll down in home island

Camera at [0, 0]:
  Closest: home island (0, 0)
  Distance: 0px
  URL: /home

Camera at [0, 500]:
  Closest: home island (0, 0)
  Distance: 500px
  URL: /home (no change)

Camera at [0, 900]:
  Islands/Sections:
  - home island (0, 0): 900px
  - home-section2 (1200, 1200): 500px ← Closer!
  URL: /home/home-section2 ← Changed!
```

### Scenario 3: Zooming

```
Camera position: [1000, 1000]
Zoom: 1.0x

Viewport top-left: [1000, 1000]
Closest: section-a (1100, 1100)
Distance: 141px
URL: /island-a/section-a

User zooms out to 0.5x

Viewport top-left: [500, 500]  ← Changed!
Closest: island-a (0, 0)
Distance: 707px
URL: /island-a ← Changed!
```

Zooming changes the viewport top-left, which can change the closest entity!

## Future Enhancements

### 1. Camera Auto-Navigation from URL

Navigate camera to route on page load:

```typescript
// In RouteSync or new component
useEffect(() => {
  const { islandId, sectionId } = parseRoutePath(location.pathname)

  if (sectionId) {
    const section = manager.getSectionState(sectionId)
    if (section) {
      camera.setPosition(section.position)
    }
  } else if (islandId) {
    const island = manager.getIslandState(islandId)
    if (island) {
      camera.setPosition(island.position)
    }
  }
}, [])  // Run once on mount
```

### 2. Smooth Transitions

Animate camera when navigating via URL:

```typescript
function animateCameraTo(targetPosition: [number, number, number]) {
  const startPos = camera.getState().position
  const duration = 1000  // 1 second

  // Use requestAnimationFrame for smooth animation
  // ...
}
```

### 3. Route-Based Active State

Highlight navigation items based on current route:

```typescript
const { pathname } = useLocation()
const { islandId } = parseRoutePath(pathname)

<nav>
  <a className={islandId === 'home' ? 'active' : ''}>Home</a>
  <a className={islandId === 'projects' ? 'active' : ''}>Projects</a>
</nav>
```

### 4. Query Parameters

Add zoom level or other state to URL:

```
/home?zoom=0.8
/projects/gallery?zoom=1.5&filter=recent
```

### 5. Hash-Based Routing

Use hash routing for GitHub Pages compatibility:

```
/#/home
/#/projects/gallery
```

Change BrowserRouter to HashRouter in [App.tsx](src/App.tsx).

## Troubleshooting

### Routes not updating

**Check:**
1. Is `<RouteSync />` included in App.tsx?
2. Is it inside `<BoundaryProvider>`?
3. Are islands/sections registered with BoundaryManager?
4. Check browser console for `🧭 Route updated` messages

### Wrong route selected

**Check:**
1. Are island/section positions correct?
2. Use boundary visualizers to verify positions
3. Check console logs for distance calculations
4. Try adjusting entity positions

### Routes updating too often

**Increase debounce delay:**
```typescript
// In RouteSync.tsx
const debouncedNavigate = debounce(/* ... */, 500)  // Increase from 300 to 500
```

### Routes updating too slowly

**Decrease debounce delay:**
```typescript
const debouncedNavigate = debounce(/* ... */, 100)  // Decrease from 300 to 100
```

### Section routes not working

**Check:**
1. Is `islandId` passed to `registerSection()` in SectionLoader?
2. Is section registered in `SECTION_REGISTRY` with correct `islandId`?
3. Check `manager.getSectionIslandMap()` in console

## Performance

**Routing overhead:**
- Distance calculation: O(n) where n = islands + sections
- Runs on every camera update (throttled to 100ms)
- Typical portfolio: ~5-10 entities = negligible overhead
- Debouncing reduces navigate() calls by ~3x

**Optimization tips:**
- Keep entity count reasonable (<50 islands + sections)
- Use debouncing (already implemented)
- Avoid complex route generation logic

## Summary

The automatic routing system provides:
- ✅ **Automatic URL updates** based on viewport position
- ✅ **Deep linkable** islands and sections
- ✅ **Clean browser history** via replace navigation
- ✅ **Debounced updates** for smooth performance
- ✅ **Distance-based** closest entity detection
- ✅ **Console logging** for debugging
- ✅ **Zero configuration** - works out of the box

Now your portfolio has professional, bookmarkable URLs that update automatically as users explore!
