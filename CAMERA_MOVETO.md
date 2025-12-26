# CameraViewport.moveTo() Function

## Overview

The `CameraViewport` component now exposes a comprehensive `moveTo()` function that synchronizes both:
- **2D HTML content** (CSS transforms: `translate()` and `scale()`)
- **3D R3F content** (Three.js scene position and scale)

This ensures that when you programmatically move the camera, both the 2D and 3D layers stay perfectly aligned.

## Function Signature

```typescript
moveTo(
  x: number,        // X position in world space (pixels)
  y: number,        // Y position in world space (pixels)
  z?: number,       // Z position (default: 0, reserved for future 3D features)
  zoom?: number,    // Zoom level (default: current zoom)
  smooth?: boolean  // If true, smoothly interpolate. If false, jump immediately (default: false)
): void
```

## How It Works

### Immediate Mode (`smooth: false`)
When `smooth` is `false` (default), the function:
1. Updates `targetPositionRef` and `currentPositionRef` to the new position
2. Updates `targetZoomRef` and `currentZoomRef` to the new zoom
3. Calls `camera.setPosition()` and `camera.setZoom()` (updates CameraContext)
4. This triggers `CameraSync` in R3F to update the Three.js scene
5. Directly applies CSS transform to `contentRef` element
6. Result: **Instant jump** to the new position with both 2D and 3D content in sync

### Smooth Mode (`smooth: true`)
When `smooth` is `true`, the function:
1. Updates only `targetPositionRef` and `targetZoomRef`
2. Leaves `currentPositionRef` and `currentZoomRef` unchanged
3. The animation loop (ticker) gradually interpolates from current to target
4. Result: **Smooth transition** over time (speed controlled by `trailingSpeed`)

## Usage Examples

### Basic Usage (from RouteSync)

```typescript
import { useRef } from 'react'
import { CameraViewport, CameraViewportHandle } from './components/canvas/CameraViewport'

function App() {
  const cameraRef = useRef<CameraViewportHandle>(null)

  const navigateToIsland = (islandId: string) => {
    const position = getIslandPosition(islandId) // e.g., [4000, 4000, 0]

    // Instant jump to island
    cameraRef.current?.moveTo(position[0], position[1], position[2])

    // OR smooth transition to island
    cameraRef.current?.moveTo(position[0], position[1], position[2], undefined, true)
  }

  return (
    <CameraViewport ref={cameraRef}>
      {/* Your content */}
    </CameraViewport>
  )
}
```

### From RouteSync Component

```typescript
// RouteSync.tsx
import { useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useCameraViewport } from './CameraViewportContext' // Hypothetical context

export function RouteSync() {
  const location = useLocation()
  const cameraViewport = useCameraViewport() // Gets the ref to CameraViewport

  useEffect(() => {
    const { islandId } = parseRoutePath(location.pathname)

    if (islandId) {
      const position = manager.getIslandPosition(islandId)

      if (position) {
        // Immediately jump to the island position
        cameraViewport.current?.moveTo(position[0], position[1], position[2])
      }
    }
  }, [location.pathname])

  return null
}
```

### Advanced Examples

```typescript
// Jump to specific coordinates with custom zoom
cameraRef.current?.moveTo(1000, 2000, 0, 1.5)  // Go to (1000, 2000) with 1.5x zoom

// Smooth pan to new location
cameraRef.current?.moveTo(5000, 5000, 0, undefined, true)  // Keep current zoom, smooth transition

// Zoom in at current position
const currentPos = camera.getState().position
cameraRef.current?.moveTo(currentPos[0], currentPos[1], currentPos[2], 2.0)  // 2x zoom

// Smooth zoom out
cameraRef.current?.moveTo(currentPos[0], currentPos[1], currentPos[2], 0.5, true)  // Smooth 0.5x zoom
```

## Integration with Routing

To make URL navigation move the camera, you need to:

1. **Pass ref to CameraViewport in App.tsx:**

```typescript
// App.tsx
import { useRef } from 'react'
import { CameraViewport, CameraViewportHandle } from './components/canvas/CameraViewport'
import { CameraViewportContext } from './context/CameraViewportContext'

function App() {
  const cameraViewportRef = useRef<CameraViewportHandle>(null)

  return (
    <BrowserRouter>
      <MenuProvider>
        <WorldProvider>
          <SceneProvider>
            <CameraProvider>
              <BoundaryProvider>
                <CameraViewportContext.Provider value={cameraViewportRef}>
                  <RouteSync />
                  <Navigation />
                  <CameraViewport ref={cameraViewportRef}>
                    <World dimensions={[10000, 10000]}>
                      {/* ... */}
                    </World>
                  </CameraViewport>
                </CameraViewportContext.Provider>
              </BoundaryProvider>
            </CameraProvider>
          </SceneProvider>
        </WorldProvider>
      </MenuProvider>
    </BrowserRouter>
  )
}
```

2. **Create CameraViewportContext (optional):**

```typescript
// context/CameraViewportContext.tsx
import { createContext, useContext, type RefObject } from 'react'
import type { CameraViewportHandle } from '../components/canvas/CameraViewport'

export const CameraViewportContext = createContext<RefObject<CameraViewportHandle> | null>(null)

export function useCameraViewport() {
  const context = useContext(CameraViewportContext)
  if (!context) {
    throw new Error('useCameraViewport must be used within CameraViewportContext.Provider')
  }
  return context
}
```

3. **Use in RouteSync:**

```typescript
// RouteSync.tsx
import { useCameraViewport } from '../context/CameraViewportContext'

export function RouteSync() {
  const { manager } = useBoundary()
  const navigate = useNavigate()
  const location = useLocation()
  const cameraViewportRef = useCameraViewport()
  const isNavigatingFromUrl = useRef(false)

  // Effect 1: Navigate camera to island on URL change
  useEffect(() => {
    const { islandId } = parseRoutePath(location.pathname)

    if (islandId) {
      const position = manager.getIslandPosition(islandId)

      if (position) {
        // Set flag to prevent viewport-based routing from interfering
        isNavigatingFromUrl.current = true

        // Use moveTo to jump camera to island position
        cameraViewportRef.current?.moveTo(position[0], position[1], position[2])

        console.log(`📍 Navigated camera to island "${islandId}" at position:`, position)

        // Clear flag after a delay
        setTimeout(() => {
          isNavigatingFromUrl.current = false
        }, 1000)
      }
    }
  }, [location.pathname, manager, cameraViewportRef])

  // ... rest of RouteSync
}
```

## Technical Details

### What happens when you call `moveTo(4000, 4000, 0)`?

1. **CameraViewport updates:**
   - `targetPositionRef.current = [4000, 4000, 0]`
   - `currentPositionRef.current = [4000, 4000, 0]`
   - Applies CSS: `transform: translate(4000px, 4000px) scale(1)`

2. **CameraContext updates:**
   - `camera.setPosition([4000, 4000, 0])`
   - This triggers `notifyListeners()` (throttled 100ms)

3. **CameraSync (R3F) receives update:**
   - Reads camera state: `position = [4000, 4000, 0]`
   - Calculates `pixelToUnit` conversion factor
   - Updates Three.js scene: `scene.position.set(4000 * pixelToUnit, -4000 * pixelToUnit, 0)`
   - Note: Y is inverted because CSS +Y is down, Three.js +Y is up

4. **Result:**
   - 2D HTML content moves to `(4000px, 4000px)`
   - 3D objects in scene move to align with 2D content
   - Everything stays perfectly synchronized

### Synchronization Flow

```
moveTo(x, y, z)
    ↓
┌─────────────────────────┐     ┌─────────────────────────┐
│  CameraViewport         │     │  CameraContext          │
│  - targetPositionRef    │────→│  - stateRef.position    │
│  - currentPositionRef   │     │  - notifyListeners()    │
│  - CSS transform        │     └──────────┬──────────────┘
└─────────────────────────┘                │
                                           ↓
                              ┌─────────────────────────┐
                              │  CameraSync (R3F)       │
                              │  - scene.position       │
                              │  - scene.scale          │
                              │  - gl.render()          │
                              └─────────────────────────┘
```

## Troubleshooting

### Issue: 2D content moves but 3D doesn't

**Cause:** CameraSync isn't receiving the camera state update

**Fix:** Ensure `camera.setPosition()` is being called in `moveTo()`

### Issue: 3D content moves but 2D doesn't

**Cause:** CSS transform isn't being applied

**Fix:** Ensure `contentRef.current` is valid and CSS transform is applied

### Issue: Position is off by some amount

**Cause:** Pixel-to-unit conversion mismatch between CSS and Three.js

**Fix:** Check `pixelToUnit` calculation in CameraSync matches your setup

## Performance Notes

- **Immediate mode** (`smooth: false`): No performance overhead, instant update
- **Smooth mode** (`smooth: true`): Uses animation ticker, ~60fps interpolation
- Both modes update R3F on every frame (via ticker in CameraSync)
- CSS transforms are hardware-accelerated, very performant

## Summary

The `moveTo()` function provides a **single source of truth** for camera movement, ensuring:

✅ 2D HTML content and 3D R3F content stay synchronized
✅ Both immediate jumps and smooth transitions are supported
✅ Easy integration with routing and navigation systems
✅ Consistent behavior across all camera movements

Use this function whenever you need to programmatically move the camera, rather than directly manipulating camera state or CSS transforms separately.
