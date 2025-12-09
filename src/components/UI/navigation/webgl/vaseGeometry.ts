export interface VaseGeometry {
  vertices: Float32Array
  normals: Float32Array
  indices: Uint16Array
}

export function createVaseGeometry(): VaseGeometry {
  const segments = 32
  const heightSegments = 24
  const vertices: number[] = []
  const normals: number[] = []
  const indices: number[] = []

  // Vase profile function (radius at different heights)
  const profile = (t: number): number => {
    // Creates a vase shape using a piecewise curve
    const neck = 0.3
    const base = 0.5
    const belly = 0.6

    if (t < 0.2) {
      // Base
      return base + (belly - base) * (t / 0.2)
    } else if (t < 0.7) {
      // Belly to neck
      return belly - (belly - neck) * ((t - 0.2) / 0.5)
    } else {
      // Neck to opening
      return neck + (0.4 - neck) * ((t - 0.7) / 0.3)
    }
  }

  // Generate vertices and normals
  for (let i = 0; i <= heightSegments; i++) {
    const v = i / heightSegments
    const y = v * 2 - 1 // Map to -1 to 1
    const radius = profile(v)

    for (let j = 0; j <= segments; j++) {
      const u = j / segments
      const theta = u * Math.PI * 2

      const x = Math.cos(theta) * radius
      const z = Math.sin(theta) * radius

      vertices.push(x, y, z)

      // Calculate normal using derivative of profile
      const epsilon = 0.01
      const radiusNext = profile(Math.min(v + epsilon, 1))
      const radiusPrev = profile(Math.max(v - epsilon, 0))
      const dRadius = (radiusNext - radiusPrev) / (2 * epsilon)

      const nx = Math.cos(theta)
      const ny = -dRadius
      const nz = Math.sin(theta)
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz)

      normals.push(nx / len, ny / len, nz / len)
    }
  }

  // Generate indices for triangles
  for (let i = 0; i < heightSegments; i++) {
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j
      const b = a + segments + 1
      const c = a + 1
      const d = b + 1

      // Two triangles per quad
      indices.push(a, b, c)
      indices.push(b, d, c)
    }
  }

  return {
    vertices: new Float32Array(vertices),
    normals: new Float32Array(normals),
    indices: new Uint16Array(indices)
  }
}
