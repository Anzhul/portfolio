# Simple Loading System

## Overview

A lightweight loading system that tracks content loading and applies CSS classes without complex React state management.

## How It Works

1. **SimpleLoadingManager** - Plain JavaScript class that:
   - Counts registered items per island
   - Counts loaded items per island
   - Directly manipulates DOM to add `loaded` class when ready
   - Adds `loaded` class to `<body>` when everything is loaded

2. **useSimpleLoading** - Hook that:
   - Registers an item on mount
   - Returns a `markLoaded()` function
   - Uses refs to prevent duplicate registrations

## Usage

### In Components

```tsx
import { useSimpleLoading } from '../hooks/useSimpleLoading'

function MyComponent() {
  const { markLoaded } = useSimpleLoading({ islandId: 'home' })

  useEffect(() => {
    // When your content is loaded:
    markLoaded()
  }, [])
}
```

### CSS Classes

Elements automatically get classes:

- `.loading` - Initially applied
- `.loaded` - Added when island content is fully loaded
- `.active` - Added when element is in viewport (existing behavior)

### Example CSS

```scss
.home {
  opacity: 0;
  transition: opacity 0.6s;

  &.loaded {
    opacity: 1;
  }

  &.active {
    // Additional styles when in viewport
  }
}

body.loaded {
  // Styles when everything is loaded
}
```

## Files

- `src/utils/SimpleLoadingManager.ts` - Core loading manager
- `src/hooks/useSimpleLoading.ts` - React hook
- `src/App.tsx` - Marks app as loaded
- `src/components/loading/IslandLoader.tsx` - Tracks island loading
- `src/components/loading/SectionLoader.tsx` - Tracks section loading
- `src/components/canvas/3DObjects/ImagePlane.tsx` - Tracks texture loading

## Performance Optimizations

### Batched DOM Updates
- Uses `requestAnimationFrame` to batch multiple updates into a single frame
- Prevents layout thrashing from multiple DOM queries
- Updates happen at most once per frame

### Scoped DOM Queries
- Searches within `.world` container instead of entire document
- Reduces DOM traversal time significantly
- More efficient with large DOMs

### Smart Caching
- Only checks "all loaded" state once
- Uses `Set` for pending updates (O(1) lookups)
- Prevents redundant work

### Hook Optimization
- Uses `useCallback` for stable function references
- Refs prevent duplicate registrations and loads
- No re-renders triggered

## Advantages

- ✅ **No infinite loops** - No React state management
- ✅ **Simple** - Just counters and DOM manipulation
- ✅ **Fast** - Batched updates, scoped queries, no re-renders
- ✅ **Efficient** - O(1) operations, minimal DOM access
- ✅ **Direct** - Classes applied immediately when loaded

## Performance Metrics

- **Registration**: O(1) - Map lookup/insert
- **Mark Loaded**: O(1) - Counter increment
- **DOM Update**: O(n) where n = elements with matching class (batched per frame)
- **Memory**: O(k) where k = number of unique islands (~5-10 typically)
