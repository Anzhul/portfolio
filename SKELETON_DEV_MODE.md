# Skeleton Development Mode

## Overview

You can now preview island skeletons without loading the actual island content using URL parameters.

## Changes Made

### 1. Home Island No Longer Auto-Loads

**Before:** Home island had `loadImmediately: true`
**Now:** Home island lazy loads like all other islands

This means when you first load the app, you'll see the home island skeleton until you're within the load radius (3000px) or preload zone (6000px).

### 2. Skeleton Preview Mode

Added URL parameters to force skeleton display for development and design purposes.

## Usage

### Show All Skeletons
```
http://localhost:5175/?skeleton=true
```
This will show **all** island skeletons instead of loading the actual content. Perfect for:
- Designing skeleton layouts
- Testing skeleton animations
- Ensuring skeletons match island layouts

### Show Specific Island Skeletons
```
http://localhost:5175/?skeleton=home
http://localhost:5175/?skeleton=home,projects
http://localhost:5175/?skeleton=home,projects,about
```
This will show only the specified island skeletons. Useful for:
- Comparing skeleton vs actual content side-by-side (load some islands, not others)
- Testing individual skeleton designs

### Normal Mode (No Skeletons)
```
http://localhost:5175/
```
Standard behavior - islands load based on camera proximity.

## How It Works

The `IslandLoader` component now checks for the `skeleton` URL parameter:

```typescript
// In IslandLoader.tsx
const forceSkeletonMode = shouldShowSkeleton(config.id)

// Dev mode: Force skeleton display
if (forceSkeletonMode) {
  return <SkeletonComponent />
}
```

This happens **before** any loading logic, so:
- ✅ No network requests for island chunks
- ✅ No boundary checks needed
- ✅ Instant skeleton display
- ✅ Skeletons stay visible regardless of camera position

## Development Workflow

### Designing a New Island Skeleton

1. Create your skeleton component:
   ```tsx
   // src/island/projects/ProjectsIslandSkeleton.tsx
   export function ProjectsIslandSkeleton() {
     return <div className="projects-skeleton">...</div>
   }
   ```

2. Add it to the registry:
   ```typescript
   // src/config/islandRegistry.ts
   import { ProjectsIslandSkeleton } from '../island/projects/ProjectsIslandSkeleton'

   export const ISLAND_REGISTRY = {
     // ...
     projects: {
       skeleton: ProjectsIslandSkeleton,
       // ...
     }
   }
   ```

3. Preview it in isolation:
   ```
   http://localhost:5175/?skeleton=projects
   ```

4. Build the actual island content while referencing the skeleton:
   ```
   http://localhost:5175/?skeleton=projects
   # In another browser window:
   http://localhost:5175/
   ```

### Testing Skeleton Animations

1. Force skeleton mode:
   ```
   http://localhost:5175/?skeleton=true
   ```

2. Edit skeleton styles in real-time:
   ```scss
   // src/island/home/HomeIslandSkeleton.scss
   @keyframes skeleton-shimmer {
     0% { background-position: 200% 0; }
     100% { background-position: -200% 0; }
   }
   ```

3. See changes instantly with HMR (hot module reload)

### Comparing Skeleton to Actual Content

**Method 1: Side-by-side browser windows**
```
Window 1: http://localhost:5175/?skeleton=home
Window 2: http://localhost:5175/
```

**Method 2: Toggle the URL parameter**
```
# See skeleton
http://localhost:5175/?skeleton=home

# Remove parameter to see actual content
http://localhost:5175/
```

## Advanced: Future Enhancements

You can extend the dev mode utilities in [devMode.ts](src/utils/devMode.ts):

### Artificial Delay (Not Yet Implemented)
```typescript
// Add artificial delay to test loading states
export function getArtificialDelay(): number {
  const params = new URLSearchParams(window.location.search)
  const delay = params.get('delay')
  return delay ? parseInt(delay, 10) : 0
}

// Usage in IslandLoader:
const delay = getArtificialDelay()
if (delay > 0) {
  await new Promise(resolve => setTimeout(resolve, delay))
}
```

Then test with:
```
http://localhost:5175/?delay=3000
```

### Disable Preloading
```
http://localhost:5175/?nopreload=true
```

### Force Loading State
```
http://localhost:5175/?loading=home
```

## File Structure

```
src/
├── utils/
│   └── devMode.ts                      # URL parameter utilities
├── components/
│   └── loading/
│       └── IslandLoader.tsx            # Uses devMode utilities
└── island/
    └── home/
        ├── HomeIslandSkeleton.tsx      # Skeleton component
        └── HomeIslandSkeleton.scss     # Skeleton styles
```

## Quick Reference

| URL Parameter | Example | Effect |
|---------------|---------|--------|
| `?skeleton=true` | `localhost:5175/?skeleton=true` | Show all skeletons |
| `?skeleton=home` | `localhost:5175/?skeleton=home` | Show only home skeleton |
| `?skeleton=home,projects` | `localhost:5175/?skeleton=home,projects` | Show multiple skeletons |
| (none) | `localhost:5175/` | Normal loading behavior |

## Tips

1. **Use skeleton mode during design:** Get the skeleton layout perfect before building island content
2. **Match layouts:** Skeletons should closely match the actual content layout for smooth transitions
3. **Test animations:** Shimmer and pulse effects should feel smooth, not distracting
4. **Accessibility:** Skeletons should have `aria-busy="true"` and `aria-label="Loading..."` for screen readers
5. **Performance:** Keep skeletons lightweight - avoid heavy CSS or complex DOM structures

## Removing Skeleton Mode

If you want to disable skeleton preview mode in production:

```typescript
// In devMode.ts
export function shouldShowSkeleton(islandId: string): boolean {
  // Disable in production
  if (import.meta.env.PROD) return false

  // Rest of the code...
}
```

This ensures the URL parameter only works in development builds.