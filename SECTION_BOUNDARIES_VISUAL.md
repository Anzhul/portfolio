# Section Boundary Visualization Guide

## Overview

Sections now support visual boundary indicators, similar to islands! This makes it easy to see and debug section loading boundaries during development.

## Visual Differences

### Island Boundaries
- **Load Radius:** Red solid circle (4px)
- **Active Radius:** Blue solid circle (3px)
- **Label:** 🌴 Island
- **Z-Index:** 1000-1001

### Section Boundaries
- **Load Radius:** Green dashed circle (3px) `#22c55e`
- **Active Radius:** Cyan dashed circle (2px) `#06b6d4`
- **Center Marker:** Cyan dot with white border
- **Label:** 📄 Section
- **Z-Index:** 999-1002

**Why different styles?**
- Dashed lines distinguish sections from islands
- Different colors (green/cyan vs red/blue) prevent confusion
- Slightly lower z-index so section boundaries appear behind island boundaries

## How to Enable

### Method 1: Using the Section Component (Recommended)

Wrap your section content in the `Section` component:

```tsx
import { Section } from '../../../components/world/Section'

export function MySection() {
  return (
    <Section
      id="my-section"
      islandId="home"
      name="my-section"
      position={[1200, 1200, 0]}  // Match position from sectionRegistry
      boundaries={{
        loadRadius: 2000,
        activeRadius: 1000,
      }}
      showBoundaries={true}  // Enable visual boundaries
    >
      {/* Your section content */}
      <div className="section-content">
        <h2>My Section</h2>
        <p>Content here...</p>
      </div>
    </Section>
  )
}
```

### Method 2: Direct SectionBoundaryVisualizer

For custom layouts, use the visualizer directly:

```tsx
import { SectionBoundaryVisualizer } from '../../../components/boundary/SectionBoundaryVisualizer'

export function MySection() {
  return (
    <>
      {/* Show boundaries in development */}
      {import.meta.env.DEV && (
        <SectionBoundaryVisualizer
          position={[1200, 1200, 0]}
          boundaries={{
            loadRadius: 2000,
            activeRadius: 1000,
          }}
          sectionId="my-section"
        />
      )}

      {/* Your content */}
      <div>...</div>
    </>
  )
}
```

## Example: HomeSection2

Here's how Section2 is configured with visual boundaries:

```tsx
// src/island/home/sections/Section2.tsx
import { Section } from '../../../components/world/Section'

export function HomeSection2() {
  return (
    <Section
      id="home-section2-wrapper"
      islandId="home"
      name="section2"
      position={[1200, 1200, 0]}  // Match sectionRegistry position
      boundaries={{
        loadRadius: 2000,   // Green dashed circle
        activeRadius: 1000, // Cyan dashed circle
      }}
      showBoundaries={true}  // Show boundaries
    >
      <div className="home-section2">
        <h2>Section 2: Lazy Loaded Content</h2>
        <p>This section is lazy-loaded when you scroll down or get within its boundaries!</p>
      </div>
    </Section>
  )
}
```

## What You'll See

When you navigate to the section in your browser:

1. **Far away (> 4000px):**
   - No visual boundaries (outside preload zone)

2. **Approaching (< 4000px):**
   - Green dashed circle appears (load radius at 2000px × 2 = 4000px preload zone)
   - Cyan dashed circle appears (active radius at 1000px × 2 = 2000px preload zone)
   - Cyan center dot marks exact section position
   - Label shows "📄 Section"

3. **Within load radius (< 2000px):**
   - Console: `📄 Section "home-section2" LOADING`
   - Green circle matches section load boundary
   - Content starts loading

4. **Within active radius (< 1000px):**
   - Console: `✨ Section "home-section2" ACTIVE`
   - Cyan circle matches section active boundary
   - Section is fully active

## Positioning

**IMPORTANT:** The `position` in your Section component must match the `position` in `sectionRegistry.ts`:

```typescript
// In sectionRegistry.ts
export const SECTION_REGISTRY = {
  'home-section2': {
    position: [1200, 1200, 0],  // ← This position
    // ...
  }
}

// In Section2.tsx
<Section
  position={[1200, 1200, 0]}  // ← Must match!
  // ...
/>
```

**Why?** The BoundaryManager uses the registry position for boundary detection, while the Section component uses its own position for rendering the visual circles. They need to match for accurate visualization.

## Development Workflow

### 1. Design Section Layout
```tsx
<Section
  position={[0, 800, 0]}
  boundaries={{
    loadRadius: 2000,
    activeRadius: 1000,
  }}
  showBoundaries={true}  // Enable during design
>
  {/* Design your content */}
</Section>
```

### 2. Test Boundaries
- Pan camera around in the browser
- Watch green/cyan circles
- Verify boundaries trigger at correct distances
- Check console logs for LOADING/ACTIVE messages

### 3. Adjust Radii
```tsx
boundaries={{
  loadRadius: 2500,   // Increase if loading too late
  activeRadius: 1200, // Increase for earlier activation
}}
```

### 4. Production
```tsx
showBoundaries={import.meta.env.DEV}  // Only show in dev mode
```

## Troubleshooting

### Boundaries not showing

**Check:**
1. Is `showBoundaries={true}` set?
2. Is `boundaries` prop provided?
3. Are you viewing in the browser (not just code editor)?

### Boundaries in wrong position

**Check:**
1. Does Section `position` match sectionRegistry `position`?
2. Are coordinates absolute (not relative)?

### Overlapping with island boundaries

This is normal! Sections should be inside island boundaries. The visual difference (dashed vs solid, green/cyan vs red/blue) makes them distinguishable.

**Example overlap:**
```
Island at [0, 0, 0]
├─ Load radius: 3000px (red solid)
├─ Active radius: 1600px (blue solid)
└─ Section at [0, 800, 0]
   ├─ Load radius: 2000px (green dashed) ← Inside island
   └─ Active radius: 1000px (cyan dashed) ← Inside island
```

### Boundaries showing in production

Make sure to conditionally render:

```tsx
showBoundaries={import.meta.env.DEV}
```

Or remove the `showBoundaries` prop entirely (defaults to `false`).

## Components Reference

### SectionBoundaryVisualizer

**Props:**
```typescript
interface SectionBoundaryVisualizerProps {
  position: [number, number, number]  // Section center
  boundaries: BoundaryConfig          // Load/active radii
  sectionId: string                   // For debugging
}
```

**Renders:**
- Load circle (green dashed)
- Active circle (cyan dashed)
- Center marker (cyan dot)
- Label ("📄 Section")

### Section Component

**Props:**
```typescript
interface SectionProps {
  id: string
  islandId: string
  name: string
  position: [number, number, number]
  description?: string
  boundaries?: BoundaryConfig      // Optional
  showBoundaries?: boolean         // Optional, default: false
  children?: ReactNode
}
```

## Color Reference

```scss
// Island boundaries
--island-load: #FF0000 (red)
--island-active: #0000FF (blue)

// Section boundaries
--section-load: #22c55e (green-500)
--section-active: #06b6d4 (cyan-500)

// Styles
--island-border: solid
--section-border: dashed
```

## Visual Hierarchy

```
Z-Index layers (lowest to highest):
999  - Section load circle (green dashed)
1000 - Section active circle (cyan dashed)
     - Island load circle (red solid)
1001 - Section center marker (cyan dot)
     - Island active circle (blue solid)
1002 - Section label
```

This ensures:
- Island boundaries appear on top of section boundaries
- Section labels are always visible
- No visual clipping issues

## Performance Notes

**Boundary visualizers are lightweight:**
- 4 DOM elements per section (2 circles + 1 dot + 1 label)
- Memoized styles (no recalculation on re-render)
- `pointer-events: none` (doesn't block interactions)
- Only rendered when `showBoundaries={true}`

**Best practice:**
```tsx
// Only show in development
<Section
  showBoundaries={import.meta.env.DEV}
  // ...
/>
```

This ensures zero overhead in production builds.

## Summary

Section boundary visualization provides:
- ✅ **Visual debugging** - See exact boundary circles
- ✅ **Color-coded** - Green/cyan for sections, red/blue for islands
- ✅ **Dashed style** - Easy distinction from island boundaries
- ✅ **Center markers** - Precise position indicators
- ✅ **Labels** - Clear identification
- ✅ **Dev-only** - Can be disabled in production

Now you can visually debug section loading boundaries just like islands!
