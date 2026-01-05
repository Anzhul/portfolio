# Lazy3DObject Component

A wrapper component for progressively loading React Three Fiber components, keeping initial page loads fast while adding rich 3D content.

## Features

- **Progressive Loading**: Load R3F only when needed
- **Multiple Strategies**: Immediate, delayed, intersection observer, or user interaction
- **Flexible**: Works with any R3F component
- **Performant**: Uses IntersectionObserver and custom animation ticker
- **Customizable**: Full control over placeholders and loading states

## Usage

### Basic Example

```tsx
import { lazy } from 'react'
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject'

// Lazy import your 3D component
const FloatingObject = lazy(() => import('../../components/canvas/home/FloatingObject'))

function MyPage() {
  return (
    <Lazy3DObject
      loadStrategy="intersection"
      component={FloatingObject}
      componentProps={{ color: '#B05248', size: 1.5 }}
    />
  )
}
```

### Load Strategies

#### 1. Immediate
Load the 3D component as soon as the page renders (same as normal lazy loading).

```tsx
<Lazy3DObject
  loadStrategy="immediate"
  component={MyComponent}
/>
```

#### 2. Delayed
Load after a specified delay (in milliseconds).

```tsx
<Lazy3DObject
  loadStrategy="delayed"
  delay={2000} // Load after 2 seconds
  component={HeroScene}
/>
```

**Best for**: Hero section 3D objects that should appear quickly but not block initial render.

#### 3. Intersection Observer
Load when the container scrolls into the viewport.

```tsx
<Lazy3DObject
  loadStrategy="intersection"
  intersectionMargin="200px" // Start loading 200px before entering viewport
  intersectionThreshold={0.1} // Load when 10% visible
  component={FloatingObject}
/>
```

**Best for**: Below-the-fold content, gallery items, scattered decorative elements.

#### 4. User Interaction
Load only when user clicks or hovers over the container.

```tsx
<Lazy3DObject
  loadStrategy="interaction"
  component={InteractiveModel}
  placeholder={<div>Click to load 3D model</div>}
/>
```

**Best for**: Heavy 3D models, optional content, interactive experiences.

### Custom Placeholders

```tsx
<Lazy3DObject
  loadStrategy="delayed"
  delay={1500}
  component={HeroScene}
  placeholder={
    <div className="custom-placeholder">
      <img src="/preview.jpg" alt="Loading..." />
    </div>
  }
  loadingFallback={
    <div className="custom-loading">
      <span>Loading 3D scene...</span>
    </div>
  }
/>
```

### Callbacks

Track loading lifecycle:

```tsx
<Lazy3DObject
  loadStrategy="intersection"
  component={FloatingObject}
  onLoadStart={() => console.log('Started loading R3F')}
  onLoadComplete={() => console.log('3D component ready')}
/>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `loadStrategy` | `'immediate' \| 'delayed' \| 'intersection' \| 'interaction'` | Required | How to trigger loading |
| `component` | `React.LazyExoticComponent<any>` | Required | Lazy-loaded 3D component |
| `delay` | `number` | `2000` | Delay in ms (for 'delayed' strategy) |
| `intersectionMargin` | `string` | `'100px'` | Margin for IntersectionObserver |
| `intersectionThreshold` | `number` | `0.01` | Threshold for IntersectionObserver |
| `componentProps` | `Record<string, any>` | `{}` | Props to pass to 3D component |
| `placeholder` | `React.ReactNode` | Default shape | Content shown before loading |
| `loadingFallback` | `React.ReactNode` | Spinner | Suspense fallback during load |
| `className` | `string` | `''` | CSS class for container |
| `onLoadStart` | `() => void` | - | Called when loading begins |
| `onLoadComplete` | `() => void` | - | Called when component mounts |

## Styling

The component comes with default styles, but you can customize:

```scss
.lazy-3d-container {
  // Your custom container styles

  .lazy-3d-placeholder {
    // Custom placeholder styles
  }

  .lazy-3d-loading {
    // Custom loading styles
  }
}
```

## Performance Tips

1. **Use intersection observer** for below-fold content
2. **Set appropriate margins** (200-400px) to preload before visible
3. **Keep placeholders lightweight** - they should be faster than the 3D content
4. **Don't overuse immediate strategy** - it defeats the purpose of lazy loading

## Complete Example: Home Page

```tsx
import { lazy } from 'react'
import { Lazy3DObject } from '../../components/lazy/Lazy3DObject'
import './Home.scss'

const HeroScene = lazy(() => import('../../components/canvas/home/HeroScene'))
const FloatingObject = lazy(() => import('../../components/canvas/home/FloatingObject'))

export const Home: React.FC = () => {
  return (
    <div className="home">
      {/* Hero Section */}
      <div className="home-intro">
        <header className="home-header">
          <h1>Hi, I'm Anzhu—</h1>
          <p>An artist who has wandered into development and design.</p>
        </header>

        {/* Hero 3D - loads after 1.5s */}
        <Lazy3DObject
          loadStrategy="delayed"
          delay={1500}
          component={HeroScene}
          className="hero-3d"
        />
      </div>

      {/* Content Section */}
      <main className="home-content">
        <section className="about">
          <h2>About Me</h2>
          <p>Content here...</p>
        </section>

        {/* Floating decoration - loads when scrolled into view */}
        <Lazy3DObject
          loadStrategy="intersection"
          intersectionMargin="300px"
          component={FloatingObject}
          componentProps={{ color: '#B05248', size: 1 }}
          className="floating-decoration"
        />

        <section className="projects">
          <h2>Featured Work</h2>
          {/* Projects... */}
        </section>
      </main>
    </div>
  )
}
```

## How It Works

1. **Initial Render**: Only the placeholder is rendered (lightweight HTML/CSS)
2. **Trigger**: Based on strategy, component decides when to load
3. **Loading**: React.lazy() dynamically imports the R3F component
4. **Suspense**: Shows loading fallback while chunk downloads
5. **Mount**: 3D component renders and starts animating

This keeps your initial bundle small and your page fast!
