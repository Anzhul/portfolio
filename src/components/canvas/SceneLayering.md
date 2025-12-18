# Scene Layering Guide

## How Layering Works

The World component uses a **single WebGL canvas** with HTML elements layered on top via z-index:

```
┌─────────────────────────────┐
│  HTML elements (z-index: 10+) │ ← Front HTML (optional)
├─────────────────────────────┤
│  HTML content (z-index: 5)    │ ← Main HTML content layer
├─────────────────────────────┤
│  WebGL Canvas (z-index: 0)    │ ← All 3D objects render here
└─────────────────────────────┘
```

## Z-Index Control

### For HTML Elements

You control whether HTML appears in front or behind 3D objects using z-index:

```tsx
{/* This HTML appears BEHIND 3D objects */}
<div style={{ position: 'relative', zIndex: 0 }}>
  Background content
</div>

{/* This HTML appears IN FRONT of 3D objects */}
<div style={{ position: 'relative', zIndex: 10 }}>
  Foreground content
</div>
```

### For 3D Objects

The `layer` prop on `<SceneObject>` organizes objects but doesn't affect rendering order. To control 3D object depth:

```tsx
{/* Use Three.js renderOrder */}
<SceneObject id="background-obj" layer="back">
  <mesh renderOrder={-100}>
    <boxGeometry />
    <meshStandardMaterial />
  </mesh>
</SceneObject>

<SceneObject id="foreground-obj" layer="front">
  <mesh renderOrder={100}>
    <sphereGeometry />
    <meshStandardMaterial />
  </mesh>
</SceneObject>
```

## Common Patterns

### Pattern 1: 3D Background with HTML Overlay
```tsx
<World>
  <div style={{ position: 'relative', zIndex: 10, color: 'white' }}>
    <h1>This text appears over 3D content</h1>
  </div>
</World>

<SceneObject id="bg" layer="back">
  <mesh>
    <sphereGeometry />
    <meshStandardMaterial />
  </mesh>
</SceneObject>
```

### Pattern 2: Mixed HTML and 3D
```tsx
<World>
  {/* Background HTML */}
  <div style={{ zIndex: 0 }}>Behind 3D</div>

  {/* Foreground HTML */}
  <div style={{ zIndex: 10 }}>In front of 3D</div>
</World>
```

## Performance Benefits

✅ Single WebGL context (better GPU memory usage)
✅ One render pass per frame
✅ Shared shaders, textures, and buffers
✅ ~50% less overhead vs. dual canvas approach

## Limitations

❌ Cannot render individual 3D objects in front of some HTML and behind other HTML
❌ All 3D content is on one layer (the canvas)
✅ This is fine for most use cases - use HTML z-index creatively!
