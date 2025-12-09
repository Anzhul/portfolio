# Animation System Usage Guide

## Overview

A global animation ticker system that efficiently manages all animations in a single `requestAnimationFrame` loop.

## Features

- **Single RAF loop** - All animations share one requestAnimationFrame
- **Automatic start/stop** - Ticker only runs when there are active animations
- **Tab visibility handling** - Automatically pauses when tab is hidden
- **Delta time tracking** - Frame-independent animations
- **React hooks** - Easy integration with React components
- **Built-in easing functions** - Common easing curves included

## Basic Usage

### 1. Using the Animation Class

```typescript
import { Animation, Easing } from './utils';

// Simple number animation
const anim = new Animation({
  from: 0,
  to: 100,
  duration: 1000, // milliseconds
  easing: Easing.easeOutCubic,
  onUpdate: (value) => {
    element.style.transform = `translateX(${value}px)`;
  },
  onComplete: () => {
    console.log('Animation complete!');
  }
});

anim.start();
```

### 2. Animating Multiple Properties

```typescript
import { Animation } from './utils';

const anim = new Animation({
  from: { x: 0, y: 0, opacity: 0 },
  to: { x: 100, y: 50, opacity: 1 },
  duration: 800,
  easing: Easing.easeInOutQuad,
  onUpdate: ({ x, y, opacity }) => {
    element.style.transform = `translate(${x}px, ${y}px)`;
    element.style.opacity = opacity.toString();
  }
});

anim.start();
```

### 3. Using the Ticker Directly

```typescript
import { ticker } from './utils';

const callback = (timestamp, deltaTime) => {
  // Custom animation logic
  rotation += deltaTime * 0.001;
  element.style.transform = `rotate(${rotation}deg)`;
};

// Add to ticker
ticker.add(callback);

// Remove when done
ticker.remove(callback);
```

## React Hooks

### useTicker Hook

Use for continuous animations or custom update logic:

```typescript
import { useTicker } from '../hooks/useAnimation';
import { useState } from 'react';

function RotatingElement() {
  const [rotation, setRotation] = useState(0);

  useTicker((timestamp, deltaTime) => {
    setRotation(prev => prev + deltaTime * 0.1);
  });

  return (
    <div style={{ transform: `rotate(${rotation}deg)` }}>
      Rotating!
    </div>
  );
}
```

### useAnimationController Hook

Use for controlled animations with start/stop:

```typescript
import { useAnimationController, Easing } from '../hooks/useAnimation';
import { useState } from 'react';

function FadeInBox() {
  const [opacity, setOpacity] = useState(0);
  const { animate, stop } = useAnimationController<number>();

  const handleFadeIn = () => {
    animate({
      from: 0,
      to: 1,
      duration: 500,
      easing: Easing.easeOutCubic,
      onUpdate: setOpacity,
      onComplete: () => console.log('Faded in!')
    });
  };

  return (
    <div>
      <div style={{ opacity }}>I fade in!</div>
      <button onClick={handleFadeIn}>Fade In</button>
      <button onClick={stop}>Stop</button>
    </div>
  );
}
```

## Available Easing Functions

```typescript
Easing.linear
Easing.easeInQuad
Easing.easeOutQuad
Easing.easeInOutQuad
Easing.easeInCubic
Easing.easeOutCubic
Easing.easeInOutCubic
Easing.easeInQuart
Easing.easeOutQuart
Easing.easeInOutQuart
Easing.easeInExpo
Easing.easeOutExpo
Easing.easeInOutExpo
```

## Custom Easing Function

```typescript
const customEasing = (t: number): number => {
  // Your custom easing logic
  return t * t; // Example: ease in quad
};

const anim = new Animation({
  from: 0,
  to: 100,
  duration: 1000,
  easing: customEasing,
  onUpdate: (value) => { /* ... */ }
});
```

## Performance Tips

1. **Batch DOM updates** - Update multiple properties in a single callback
2. **Use transform and opacity** - Hardware accelerated properties
3. **Avoid layout thrashing** - Read DOM properties before writing
4. **Remove callbacks** - Always clean up when animations complete
5. **Use React hooks** - Automatic cleanup on unmount

## Example: Slide-in Animation

```typescript
import { useAnimationController, Easing } from '../hooks/useAnimation';
import { useState, useEffect } from 'react';

function SlideInComponent() {
  const [position, setPosition] = useState(-100);
  const { animate } = useAnimationController<number>();

  useEffect(() => {
    animate({
      from: -100,
      to: 0,
      duration: 600,
      easing: Easing.easeOutCubic,
      onUpdate: setPosition
    });
  }, []);

  return (
    <div style={{
      transform: `translateX(${position}%)`,
      transition: 'none' // Important: disable CSS transitions
    }}>
      I slide in!
    </div>
  );
}
```

## Ticker Info

```typescript
import { ticker } from './utils';

// Check how many animations are active
console.log(ticker.activeCount);

// Manually pause/resume all animations
ticker.pause();
ticker.resume();
```
