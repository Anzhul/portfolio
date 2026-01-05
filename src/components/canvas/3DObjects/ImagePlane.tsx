import { useEffect, useRef, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useScene } from '../../../context/SceneContext'
import { useViewport } from '../../../context/ViewportContext'
import * as THREE from 'three'

interface ImagePlaneProps {
  imageUrl: string
  position?: [number, number, number]
  mobilePosition?: [number, number, number]
  height?: number
  width?: number
  mobileHeight?: number
  mobileWidth?: number
  zIndex?: number
  opacity?: number
  transparent?: boolean
  emmissive?: number
  emissiveIntensity?: number
  islandId?: string
}

export function ImagePlane({
  imageUrl,
  position = [0, 0, 0],
  mobilePosition,
  height = 100,
  width = 100,
  mobileHeight,
  mobileWidth,
  zIndex = 0,
  opacity = 1,
  transparent = false,
  emmissive = 0.0,
  emissiveIntensity = 1.0,
  islandId: _islandId // Prefix with _ to indicate intentionally unused
}: ImagePlaneProps) {
  const { addObject, removeObject } = useScene()
  const { isMobileOnly } = useViewport()
  const planeId = useRef(`image-plane-${Math.random()}`).current

  // Use mobile values if provided and on mobile, otherwise use desktop values
  const actualPosition = isMobileOnly && mobilePosition ? mobilePosition : position
  const actualHeight = isMobileOnly && mobileHeight !== undefined ? mobileHeight : height
  const actualWidth = isMobileOnly && mobileWidth !== undefined ? mobileWidth : width

  useEffect(() => {
    // Create the 3D image plane mesh
    const plane = (
      <ImagePlaneMesh
        imageUrl={imageUrl}
        position={actualPosition}
        width={actualWidth}
        height={actualHeight}
        opacity={opacity}
        planeId={planeId}
      />
    )

    // Add to the 3D scene
    addObject(planeId, plane, zIndex)

    return () => {
      removeObject(planeId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actualPosition, actualHeight, actualWidth, zIndex, opacity, transparent, imageUrl, emmissive, emissiveIntensity])

  // This component doesn't render HTML - it only adds to the 3D scene
  return null
}

// Bicubic texture filtering shader for high-quality zoomable images
const bicubicVertexShader = `
  varying vec2 vUv;
  varying float vZoomLevel;

  void main() {
    vUv = uv;

    // Extract scale (zoom) from modelViewMatrix
    // The scale is the length of the first column vector (x-axis scaling)
    vec3 scale = vec3(
      length(vec3(modelViewMatrix[0][0], modelViewMatrix[0][1], modelViewMatrix[0][2])),
      length(vec3(modelViewMatrix[1][0], modelViewMatrix[1][1], modelViewMatrix[1][2])),
      length(vec3(modelViewMatrix[2][0], modelViewMatrix[2][1], modelViewMatrix[2][2]))
    );

    // Use x-axis scale as zoom level (scene has uniform scale)
    vZoomLevel = scale.x;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const bicubicFragmentShader = `
  uniform sampler2D map;
  uniform float opacity;
  uniform vec2 textureSize;
  uniform float borderWidth;
  uniform vec3 borderColor;

  varying vec2 vUv;
  varying float vZoomLevel;

  // Cubic interpolation using Catmull-Rom spline with increased sharpness
  // B-spline parameter adjusted for sharper results (default is 0.5, higher = sharper)
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
    // Calculate distance from edge in UV space
    vec2 edgeDist = min(vUv, 1.0 - vUv);
    float minEdgeDist = min(edgeDist.x, edgeDist.y);

    // Convert border width from pixels to UV space
    // Border width is in pixels, we need to normalize it by texture size
    float borderWidthUV = borderWidth / min(textureSize.x, textureSize.y);

    // Check if we're in the border region
    bool inBorder = borderWidth > 0.0 && minEdgeDist < borderWidthUV;

    if (inBorder) {
      // Render border
      gl_FragColor = vec4(borderColor, opacity);
    } else if (borderWidth > 0.0 && minEdgeDist < borderWidthUV * 1.5) {
      // Anti-aliasing transition zone
      float edgeFactor = smoothstep(borderWidthUV, borderWidthUV * 1.5, minEdgeDist);
      vec4 texColor = textureBicubic(map, vUv);

      // Apply blur if needed
      float blurStrength = clamp((1.0 - vZoomLevel) / (1.0 - 0.15), 0.0, 1.0);
      if (blurStrength > 0.01) {
        vec2 texelSize = 1.0 / textureSize;
        float blurRadius = blurStrength * 1.65;
        vec4 blurred = vec4(0.0);
        float totalWeight = 0.0;
        for (float y = -1.0; y <= 1.0; y += 1.0) {
          for (float x = -1.0; x <= 1.0; x += 1.0) {
            vec2 offset = vec2(x, y) * texelSize * blurRadius;
            blurred += textureBicubic(map, vUv + offset);
            totalWeight += 1.0;
          }
        }
        texColor = blurred / totalWeight;
      }

      texColor.rgb = pow(texColor.rgb, vec3(1.0 / 2.2));
      gl_FragColor = mix(vec4(borderColor, opacity), vec4(texColor.rgb, texColor.a * opacity), edgeFactor);
    } else {
      // Use bicubic filtering as base
      vec4 texColor = textureBicubic(map, vUv);

      // Apply blur when zoomed out
      float blurStrength = clamp((1.0 - vZoomLevel) / (1.0 - 0.15), 0.0, 1.0);

      if (blurStrength > 0.01) {
        vec2 texelSize = 1.0 / textureSize;
        float blurRadius = blurStrength * 1.65;

        vec4 blurred = vec4(0.0);
        float totalWeight = 0.0;

        for (float y = -1.0; y <= 1.0; y += 1.0) {
          for (float x = -1.0; x <= 1.0; x += 1.0) {
            vec2 offset = vec2(x, y) * texelSize * blurRadius;
            blurred += textureBicubic(map, vUv + offset);
            totalWeight += 1.0;
          }
        }

        texColor = blurred / totalWeight;
      }

      // Convert from linear to sRGB for proper color display
      texColor.rgb = pow(texColor.rgb, vec3(1.0 / 2.2));

      gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
    }
  }
`

// Separate component to handle texture loading
function ImagePlaneMesh({
  imageUrl,
  position,
  width,
  height,
  opacity,
  planeId
}: {
  imageUrl: string
  position: [number, number, number]
  width: number
  height: number
  opacity: number
  planeId: string
}) {
  const texture = useTexture(imageUrl)
  const meshRef = useRef<THREE.Mesh>(null)

  // Configure texture for bicubic filtering
  texture.generateMipmaps = false
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  texture.colorSpace = 'srgb'
  texture.anisotropy = 16

  // Get texture dimensions
  const textureSize = useMemo(() => {
    const image = texture.image as HTMLImageElement
    return new THREE.Vector2(image.width, image.height)
  }, [texture])

  // Create shader material once and reuse it (prevents expensive shader recompilation)
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        opacity: { value: opacity },
        textureSize: { value: textureSize },
        borderWidth: { value: 0 },
        borderColor: { value: new THREE.Vector3(0, 0, 0) }
      },
      vertexShader: bicubicVertexShader,
      fragmentShader: bicubicFragmentShader,
      transparent: true,
      side: THREE.DoubleSide
    })
    return mat
  }, [texture, opacity, textureSize])

  // Update uniforms when dependencies change (no recompilation needed)
  useEffect(() => {
    if (material) {
      material.uniforms.map.value = texture
      material.uniforms.opacity.value = opacity
      material.uniforms.textureSize.value = textureSize
      material.needsUpdate = false // Don't recompile, just update uniforms
    }
  }, [material, texture, opacity, textureSize])

  return (
    <mesh ref={meshRef} name={planeId} position={[position[0], -position[1], position[2]]}>
      <planeGeometry args={[width, height]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

