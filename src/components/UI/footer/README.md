# Footer Canvas Implementation

## Overview
The FooterCanvas component renders a tile-based 2D/3D environment using data from the Z-layer JSON files in the `src/data` folder.

## How It Works

### Tile System
- Each Z JSON file (Z0-Z6) represents a layer in the scene
- Each layer contains tiles with:
  - `id`: The sprite index in the spritesheet
  - `x`, `y`: Tile coordinates (not pixel coordinates)
  - `tileSize`: Size of each tile in pixels (typically 16px)

### Spritesheet Setup

#### Required File
Place your spritesheet image at:
```
public/footer-env/spritesheet.png
```

#### Spritesheet Layout
The spritesheet should be a grid of tiles where:
- Each tile is 16x16 pixels (matches `tileSize` in JSON)
- Tiles are arranged in rows
- Tile ID corresponds to position: `tileId = (row * tilesPerRow) + column`

#### Adjusting tilesPerRow
In `FooterCanvas.tsx`, adjust the `tilesPerRow` constant based on your spritesheet:
```typescript
const tilesPerRow = 32; // If your spritesheet is 512px wide with 16px tiles
```

Formula: `tilesPerRow = spritesheetWidth / tileSize`

### Coordinate System
- **Tile coordinates** (from JSON): Top-left origin, Y increases downward
- **World coordinates** (3D space): Centered at origin, Y increases upward
- **Layers**: Separated in Z-depth (Z0 = background, Z6 = foreground)

### Customization

#### Adjusting Scale and Position
In `FooterCanvas.tsx`, modify these values:

```typescript
const pixelSize = 0.1;  // Scale factor (higher = bigger)
const worldX = (tile.x * tileSize - 2000) * pixelSize;  // Adjust 2000 to center horizontally
const worldY = -(tile.y * tileSize - 200) * pixelSize;  // Adjust 200 to center vertically
```

#### Camera Position
Adjust camera distance to see the full scene:
```typescript
camera={{ position: [0, 0, 50], fov: 50 }}
```

### Troubleshooting

**Nothing renders:**
- Ensure spritesheet exists at `/public/footer-env/spritesheet.png`
- Check browser console for loading errors
- Verify `tilesPerRow` matches your spritesheet

**Wrong sprites appear:**
- Check `tilesPerRow` calculation
- Verify spritesheet tile order matches expected layout

**Scene too small/large:**
- Adjust `pixelSize` in the TilePlane component
- Modify camera position

**Layers appear in wrong order:**
- Z0 should be background, Z6 foreground
- Check `zIndex` values maintain correct order

## Layer Structure

The current data includes:
- **Z0**: Background layer (trees, decorations)
- **Z1**: Collision layer
- **Z2**: Decorative layer with detailed objects
- **Z3**: Ground/platform layer (largest, contains collision data)
- **Z4, Z5**: Additional decoration layers  
- **Z6**: Foreground/overlay layer

## Performance Notes
- Total tiles across all layers: ~4000+
- Each tile is a separate mesh
- Consider instancing for better performance if needed
