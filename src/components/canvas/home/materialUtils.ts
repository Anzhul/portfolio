import * as THREE from 'three'

// Bicubic texture filtering shader (same as ImagePlane for consistency)
const bicubicVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const bicubicFragmentShader = `
  uniform sampler2D map;
  uniform float opacity;
  uniform vec2 textureSize;
  uniform vec3 emissiveColor;
  uniform float emissiveIntensity;
  uniform sampler2D emissiveMap;
  uniform bool hasEmissiveMap;
  uniform bool flipX;
  uniform bool flipY;

  varying vec2 vUv;

  // Cubic interpolation using Catmull-Rom spline
  vec4 cubic(float v) {
    vec4 n = vec4(1.0, 2.0, 3.0, 4.0) - v;
    vec4 s = n * n * n;
    float x = s.x;
    float y = s.y - 4.0 * s.x;
    float z = s.z - 4.0 * s.y + 6.0 * s.x;
    float w = 6.0 - x - y - z;
    return vec4(x, y, z, w) * (1.0 / 6.0);
  }

  // Bicubic texture sampling
  vec4 textureBicubic(sampler2D sampler, vec2 texCoords) {
    vec2 texelSize = 1.0 / textureSize;
    texCoords = texCoords * textureSize - 0.5;

    vec2 fxy = fract(texCoords);
    texCoords -= fxy;

    vec4 xcubic = cubic(fxy.x);
    vec4 ycubic = cubic(fxy.y);

    vec4 c = texCoords.xxyy + vec2(-0.5, +1.5).xyxy;

    vec4 s = vec4(xcubic.xz + xcubic.yw, ycubic.xz + ycubic.yw);
    vec4 offset = c + vec4(xcubic.yw, ycubic.yw) / s;

    offset *= texelSize.xxyy;

    vec4 sample0 = texture2D(sampler, offset.xz);
    vec4 sample1 = texture2D(sampler, offset.yz);
    vec4 sample2 = texture2D(sampler, offset.xw);
    vec4 sample3 = texture2D(sampler, offset.yw);

    float sx = s.x / (s.x + s.y);
    float sy = s.z / (s.z + s.w);

    return mix(
      mix(sample3, sample2, sx),
      mix(sample1, sample0, sx),
      sy
    );
  }

  void main() {
    // Apply flip to UV coordinates
    vec2 uv = vUv;
    if (flipX) uv.x = 1.0 - uv.x;
    if (flipY) uv.y = 1.0 - uv.y;

    // Apply blur by sampling neighboring pixels
    vec2 texelSize = 1.0 / textureSize;
    float blurRadius = 2.5; // Adjust for more/less blur
    vec4 texColor = vec4(0.0);
    float totalWeight = 0.0;

    // 3x3 blur kernel
    for (float y = -1.0; y <= 1.0; y += 1.0) {
      for (float x = -1.0; x <= 1.0; x += 1.0) {
        vec2 offset = vec2(x, y) * texelSize * blurRadius;
        texColor += textureBicubic(map, uv + offset);
        totalWeight += 1.0;
      }
    }
    texColor /= totalWeight;

    // Reduced gamma correction for less color shift (1.5 instead of 2.2)
    texColor.rgb = pow(texColor.rgb, vec3(1.0 / 1.5));

    // Add emissive contribution if present
    if (hasEmissiveMap) {
      vec4 emissive = vec4(0.0);
      // Apply same blur to emissive map
      for (float y = -1.0; y <= 1.0; y += 1.0) {
        for (float x = -1.0; x <= 1.0; x += 1.0) {
          vec2 offset = vec2(x, y) * texelSize * blurRadius;
          emissive += textureBicubic(emissiveMap, uv + offset);
        }
      }
      emissive /= totalWeight;
      emissive.rgb = pow(emissive.rgb, vec3(1.0 / 1.5));
      texColor.rgb += emissive.rgb * emissiveColor * emissiveIntensity;
    } else if (emissiveIntensity > 0.0) {
      texColor.rgb += emissiveColor * emissiveIntensity;
    }

    gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
  }
`

export interface MaterialOverride {
  materialName: string // Name of the material in the GLB file
  color?: string
  emissive?: string
  emissiveIntensity?: number
  roughness?: number
  metalness?: number
  opacity?: number
  transparent?: boolean
  map?: string // Path to texture image (e.g., '/ink_Sticker.png')
  emissiveMap?: string // Path to emissive map texture
  mapRepeat?: [number, number] // Texture repeat (u, v)
  mapOffset?: [number, number] // Texture offset (u, v)
  flipX?: boolean // Flip texture horizontally
  flipY?: boolean // Flip texture vertically
  unlit?: boolean // Use MeshBasicMaterial (unaffected by lights)
}

/**
 * Apply material overrides to a GLB scene
 * Traverses the scene and applies custom materials based on material names
 *
 * @param scene - The loaded GLB scene
 * @param overrides - Array of material overrides to apply
 */
export function applyMaterialOverrides(
  scene: THREE.Object3D,
  overrides: MaterialOverride[]
): void {
  // Create a map of material overrides for quick lookup
  const overrideMap = new Map(
    overrides.map(override => [override.materialName, override])
  )

  // Create a texture loader
  const textureLoader = new THREE.TextureLoader()

  scene.traverse((child: any) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh

      if (mesh.material && !Array.isArray(mesh.material)) {
        const materialName = mesh.material.name
        const override = overrideMap.get(materialName)

        if (override) {
          // Load texture if specified
          let texture: THREE.Texture | undefined
          let textureSize = new THREE.Vector2(1, 1)

          if (override.map) {
            texture = textureLoader.load(override.map, (loadedTexture) => {
              // Get texture dimensions once loaded
              const image = loadedTexture.image as HTMLImageElement
              textureSize.set(image.width, image.height)
            })
            texture.colorSpace = 'srgb' as any
            texture.generateMipmaps = false
            texture.minFilter = THREE.NearestFilter
            texture.magFilter = THREE.NearestFilter
            texture.anisotropy = 16

            // Apply texture repeat if specified (handles flipping too)
            const repeatX = override.flipX ? -(override.mapRepeat?.[0] ?? 1) : (override.mapRepeat?.[0] ?? 1)
            const repeatY = override.flipY ? -(override.mapRepeat?.[1] ?? 1) : (override.mapRepeat?.[1] ?? 1)

            texture.repeat.set(repeatX, repeatY)
            texture.wrapS = THREE.RepeatWrapping
            texture.wrapT = THREE.RepeatWrapping

            // Apply texture offset if specified
            if (override.mapOffset) {
              texture.offset.set(override.mapOffset[0], override.mapOffset[1])
            }
          }

          // Load emissive map if specified
          let emissiveTexture: THREE.Texture | undefined
          if (override.emissiveMap) {
            emissiveTexture = textureLoader.load(override.emissiveMap)
            emissiveTexture.colorSpace = 'srgb' as any
            emissiveTexture.generateMipmaps = false
            emissiveTexture.minFilter = THREE.NearestFilter
            emissiveTexture.magFilter = THREE.NearestFilter
            emissiveTexture.anisotropy = 16

            // Apply same texture repeat/flip settings as main texture
            const repeatX = override.flipX ? -(override.mapRepeat?.[0] ?? 1) : (override.mapRepeat?.[0] ?? 1)
            const repeatY = override.flipY ? -(override.mapRepeat?.[1] ?? 1) : (override.mapRepeat?.[1] ?? 1)

            emissiveTexture.repeat.set(repeatX, repeatY)
            emissiveTexture.wrapS = THREE.RepeatWrapping
            emissiveTexture.wrapT = THREE.RepeatWrapping

            // Apply texture offset if specified
            if (override.mapOffset) {
              emissiveTexture.offset.set(override.mapOffset[0], override.mapOffset[1])
            }
          }

          // Apply material override
          if (override.map && texture) {
            // Use custom shader material for textured materials (like ImagePlane)
            const newMaterial = new THREE.ShaderMaterial({
              uniforms: {
                map: { value: texture },
                opacity: { value: override.opacity ?? 1.0 },
                textureSize: { value: textureSize },
                emissiveColor: { value: override.emissive ? new THREE.Vector3().fromArray(new THREE.Color(override.emissive).toArray()) : new THREE.Vector3(1, 1, 1) },
                emissiveIntensity: { value: override.emissiveIntensity ?? 0.0 },
                emissiveMap: { value: emissiveTexture ?? null },
                hasEmissiveMap: { value: !!emissiveTexture },
                flipX: { value: override.flipX ?? false },
                flipY: { value: override.flipY ?? false }
              },
              vertexShader: bicubicVertexShader,
              fragmentShader: bicubicFragmentShader,
              transparent: override.transparent ?? true,
              side: THREE.DoubleSide
            })
            mesh.material = newMaterial
          } else if (override.unlit) {
            // Use MeshBasicMaterial for unlit materials (not affected by lights)
            const newMaterial = new THREE.MeshBasicMaterial({
              color: override.color ? new THREE.Color(override.color) : new THREE.Color(0xffffff),
              ...(override.opacity !== undefined && { opacity: override.opacity }),
              ...(override.transparent !== undefined && { transparent: override.transparent }),
              toneMapped: false, // Disable tone mapping to preserve original colors
            })
            mesh.material = newMaterial
          } else {
            // Use MeshStandardMaterial for lit materials
            const newMaterial = new THREE.MeshStandardMaterial({
              // Start with existing material properties if it's a standard material
              ...(mesh.material.type === 'MeshStandardMaterial' && {
                color: (mesh.material as THREE.MeshStandardMaterial).color,
                roughness: (mesh.material as THREE.MeshStandardMaterial).roughness,
                metalness: (mesh.material as THREE.MeshStandardMaterial).metalness,
                map: (mesh.material as THREE.MeshStandardMaterial).map,
              }),
              // Apply overrides
              ...(override.color && { color: new THREE.Color(override.color) }),
              ...(override.emissive && { emissive: new THREE.Color(override.emissive) }),
              ...(override.emissiveIntensity !== undefined && { emissiveIntensity: override.emissiveIntensity }),
              ...(override.roughness !== undefined && { roughness: override.roughness }),
              ...(override.metalness !== undefined && { metalness: override.metalness }),
              ...(override.opacity !== undefined && { opacity: override.opacity }),
              ...(override.transparent !== undefined && { transparent: override.transparent }),
            })
            mesh.material = newMaterial
          }
        } else if (mesh.material.type === 'MeshBasicMaterial') {
          // Convert basic materials to standard for lighting compatibility
          const oldMaterial = mesh.material as THREE.MeshBasicMaterial
          mesh.material = new THREE.MeshStandardMaterial({
            color: oldMaterial.color,
            map: oldMaterial.map,
            transparent: oldMaterial.transparent,
            opacity: oldMaterial.opacity,
          })
        }
      }
    }
  })
}
