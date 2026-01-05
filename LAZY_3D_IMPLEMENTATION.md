# Lazy 3D Object Implementation Guide

This guide explains the newly implemented lazy-loading system for React Three Fiber components in your portfolio.

## 🎯 What Was Built

A complete lazy-loading system that allows you to add 3D objects to your lightweight pages without bloating the initial bundle size.

### New Files Created

```
src/
├── components/
│   ├── lazy/
│   │   ├── Lazy3DObject.tsx          # Main wrapper component
│   │   ├── Lazy3DObject.scss         # Styles with animations
│   │   └── README.md                 # Detailed documentation
│   │
│   └── canvas/
│       └── home/
│           ├── FloatingObject.tsx    # Example: Animated torus knot
│           └── HeroScene.tsx         # Example: Abstract hero composition
│
└── pages/
    └── lightweight/
        └── Home.example.tsx          # Complete usage example
```

## 🚀 How It Works

### The Problem
- Your lightweight Home and Projects pages should load fast
- But you want to add 3D objects for visual interest
- Loading R3F immediately would add ~3MB to the initial bundle

### The Solution
The `Lazy3DObject` wrapper component that:
1. Renders a lightweight placeholder initially
2. Loads R3F libraries only when triggered (delayed, scrolled into view, or clicked)
3. Shows a loading state while R3F downloads
4. Renders the 3D component smoothly once ready

### Loading Strategies

| Strategy | When It Loads | Best For |
|----------|--------------|----------|
| **immediate** | On page render | Critical 3D content |
| **delayed** | After X milliseconds | Hero sections (1-2s delay) |
| **intersection** | When scrolled into view | Below-fold decorations |
| **interaction** | On click/hover | Heavy models, optional content |

## 📝 Quick Start

### 1. Import the Components

```tsx
import { lazy } from 'react'
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject'

// Lazy import your 3D component
const FloatingObject = lazy(() => import('../../components/canvas/home/FloatingObject'))
```

### 2. Add to Your Page

```tsx
export const Home: React.FC = () => {
  return (
    <div className="home">
      <h1>Welcome</h1>

      {/* 3D object that loads after 2 seconds */}
      <Lazy3DObject
        loadStrategy="delayed"
        delay={2000}
        component={FloatingObject}
        className="my-3d-container"
      />
    </div>
  )
}
```

### 3. Style the Container

```scss
.my-3d-container {
  width: 400px;
  height: 400px;
  margin: 2rem auto;

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
}
```

## 🎨 Example Components Provided

### FloatingObject
An animated torus knot that floats and rotates.

```tsx
<Lazy3DObject
  loadStrategy="intersection"
  component={FloatingObject}
  componentProps={{
    color: '#B05248',
    size: 1.5,
    animationSpeed: 0.01
  }}
/>
```

### HeroScene
An abstract geometric composition with multiple shapes.

```tsx
<Lazy3DObject
  loadStrategy="delayed"
  delay={1500}
  component={HeroScene}
  componentProps={{
    color: '#B05248',
    accentColor: '#FF711E'
  }}
/>
```

## 📊 Performance Impact

### Before (if you loaded R3F immediately)
```
Initial Bundle: ~3.5MB
Time to Interactive: ~3s
```

### After (with lazy loading)
```
Initial Bundle: ~500KB (no change!)
Time to Interactive: ~1s
↓
R3F loads in background after trigger
3D appears: ~2-3s total (depending on strategy)
```

**Result**: Page is interactive immediately, 3D enhances progressively

## 🔧 Creating Your Own 3D Components

### Basic Template

```tsx
import { Canvas } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import { ticker } from '../../../utils/AnimationTicker'
import * as THREE from 'three'

function MyMesh() {
  const meshRef = useRef<THREE.Mesh>(null!)

  useEffect(() => {
    const animate = () => {
      if (meshRef.current) {
        meshRef.current.rotation.y += 0.01
      }
    }

    ticker.add(animate)
    return () => ticker.remove(animate)
  }, [])

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#B05248" />
    </mesh>
  )
}

function MyComponent() {
  return (
    <Canvas
      frameloop="never" // Important: Use manual ticker
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ alpha: true, antialias: true }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 5, 5]} />
      <MyMesh />
    </Canvas>
  )
}

export default MyComponent
```

### Key Points
1. **Always use `frameloop="never"`** - We use the custom ticker for efficiency
2. **Import ticker** from `../../../utils/AnimationTicker`
3. **Add to ticker in useEffect** and remove on cleanup
4. **Set `alpha: true`** in gl for transparent backgrounds

## 📖 Complete Example

See [Home.example.tsx](src/pages/lightweight/Home.example.tsx) for a complete example showing:
- Hero section with delayed 3D
- Decorative floating object with intersection observer
- Interactive model that loads on click
- Custom placeholders and styling

## 🎯 Recommended Usage for Your Home Page

```tsx
import React, { lazy } from 'react'
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject'
import './Home.scss'

const HeroScene = lazy(() => import('../../components/canvas/home/HeroScene'))
const FloatingObject = lazy(() => import('../../components/canvas/home/FloatingObject'))

export const Home: React.FC = () => {
  return (
    <div className="home">
      {/* Your existing header */}
      <div className="home-intro">
        <header className="home-header">
          <h1>Hi,</h1>
          <h1>I'm Anzhu—</h1>
          <p className="tagline">
            An artist who has wandered into development and design.
          </p>
        </header>

        {/* NEW: Hero 3D scene - loads 1.5s after page interactive */}
        <Lazy3DObject
          loadStrategy="delayed"
          delay={1500}
          component={HeroScene}
          className="hero-3d-container"
        />
      </div>

      {/* Your existing content */}
      <main className="home-content">
        <div className="home-projects">
          {/* Projects content */}
        </div>

        {/* NEW: Floating decoration - loads when scrolled into view */}
        <Lazy3DObject
          loadStrategy="intersection"
          intersectionMargin="200px"
          component={FloatingObject}
          className="floating-object-container"
        />

        <div className="home-philosophy">
          {/* Philosophy content */}
        </div>
      </main>

      <footer className="home-footer">
        {/* Footer */}
      </footer>
    </div>
  )
}
```

## 🎨 Styling Tips

### Hero Section Layout
```scss
.home-intro {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;

  .home-header {
    z-index: 2;
    position: relative;
  }

  .hero-3d-container {
    position: absolute;
    top: 0;
    right: 0;
    width: 50%;
    height: 100%;
    z-index: 1;

    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  }
}
```

### Floating Decoration
```scss
.floating-object-container {
  width: 400px;
  height: 400px;
  margin: 4rem auto;

  canvas {
    width: 100% !important;
    height: 100% !important;
  }
}
```

## 🔍 Testing Your Implementation

1. **Check initial bundle**:
   ```bash
   npm run build
   npx vite-bundle-visualizer
   ```

2. **Verify loading**:
   - Open Network tab in DevTools
   - Load your Home page
   - You should NOT see R3F chunks immediately
   - After delay/scroll, R3F chunks should load

3. **Test each strategy**:
   - `delayed`: Wait for the delay, 3D should appear
   - `intersection`: Scroll near the component
   - `interaction`: Click or hover over the placeholder

## 🚀 Next Steps

1. **Choose your 3D objects**: Decide what you want to add to your Home page
2. **Design or find models**: Create custom shapes or use existing GLTFs
3. **Integrate into Home.tsx**: Copy patterns from Home.example.tsx
4. **Style and position**: Add SCSS for proper layout
5. **Test performance**: Verify bundle sizes and loading behavior
6. **Iterate**: Adjust colors, animations, and timings

## 📚 Additional Resources

- [Lazy3DObject README](src/components/lazy/README.md) - Full API documentation
- [Home.example.tsx](src/pages/lightweight/Home.example.tsx) - Complete usage example
- [FloatingObject.tsx](src/components/canvas/home/FloatingObject.tsx) - Simple 3D component
- [HeroScene.tsx](src/components/canvas/home/HeroScene.tsx) - Complex 3D scene

## 💡 Tips

1. **Start with delayed strategy** (1-2s) for hero sections
2. **Use intersection observer** for decorative elements
3. **Keep placeholders simple** - they should load fast
4. **Test on mobile** - adjust sizes and opacity
5. **Monitor bundle size** - use Vite's bundle analyzer

---

**You're now ready to add beautiful 3D objects to your lightweight pages without sacrificing performance!**
