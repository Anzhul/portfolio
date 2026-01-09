# PortfolioCard Custom Dimensions Examples

The PortfolioCard component now supports custom width and height props for flexible layouts.

## Usage Examples

### Default Size (Grid Item)
```tsx
<PortfolioCard
  title="Mountain Range Explorer"
  date="January 2026"
  tags={['React', 'Three.js', 'TypeScript']}
  image="/mountains.png"
/>
```

### Custom Width
```tsx
<PortfolioCard
  title="Mountain Range Explorer"
  date="January 2026"
  tags={['React', 'Three.js', 'TypeScript']}
  image="/mountains.png"
  width="400px"
/>
```

### Custom Width and Height
```tsx
<PortfolioCard
  title="Mountain Range Explorer"
  date="January 2026"
  tags={['React', 'Three.js', 'TypeScript']}
  image="/mountains.png"
  width="500px"
  height="600px"
/>
```

### Using Percentages
```tsx
<PortfolioCard
  title="Mountain Range Explorer"
  date="January 2026"
  tags={['React', 'Three.js', 'TypeScript']}
  image="/mountains.png"
  width="50%"
  height="80vh"
/>
```

### Masonry/Variable Grid Layout
```tsx
const projects = [
  {
    id: 1,
    title: 'Large Feature',
    date: 'January 2026',
    tags: ['React', 'Three.js'],
    image: '/mountains.png',
    width: '100%',  // Full width
    height: '600px'
  },
  {
    id: 2,
    title: 'Small Card',
    date: 'December 2025',
    tags: ['WebGL'],
    image: '/moon.webp',
    width: '300px',
    height: '400px'
  },
  {
    id: 3,
    title: 'Tall Card',
    date: 'November 2025',
    tags: ['Canvas'],
    image: '/spaceship.webp',
    width: '400px',
    height: '700px'
  }
];

// In your component
<div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
  {projects.map((project) => (
    <PortfolioCard
      key={project.id}
      title={project.title}
      date={project.date}
      tags={project.tags}
      image={project.image}
      width={project.width}
      height={project.height}
    />
  ))}
</div>
```

## Props

- `width?: string` - CSS width value (e.g., '400px', '50%', '20rem')
- `height?: string` - CSS height value (e.g., '500px', '80vh', '30rem')
- `className?: string` - Additional CSS classes for custom styling

## Notes

- When no width/height is specified, the card defaults to 100% width and auto height
- The golden ratio (61.8% image, 38.2% content) is maintained in the image section
- Custom dimensions work with both links and clickable cards
- All hover effects and transitions still work with custom dimensions
