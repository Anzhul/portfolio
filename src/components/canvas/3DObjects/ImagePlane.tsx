import { useEffect, useRef, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { useScene } from '../../../context/SceneContext'
import { useMenu } from '../../../context/MenuContext'
import { useCamera } from '../../../context/CameraContext'
import { ticker } from '../../../utils/AnimationTicker'
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
  emissiveIntensity = 1.0
}: ImagePlaneProps) {
  const { addObject, removeObject } = useScene()
  const { isMobile } = useMenu()
  const planeId = useRef(`image-plane-${Math.random()}`).current

  // Use mobile values if provided and on mobile, otherwise use desktop values
  const actualPosition = isMobile && mobilePosition ? mobilePosition : position
  const actualHeight = isMobile && mobileHeight !== undefined ? mobileHeight : height
  const actualWidth = isMobile && mobileWidth !== undefined ? mobileWidth : width

  useEffect(() => {
    // Create the 3D image plane mesh
    const plane = (
      <ImagePlaneMesh
        imageUrl={imageUrl}
        position={actualPosition}
        width={actualWidth}
        height={actualHeight}
        opacity={opacity}
        transparent={transparent}
        emmissive={emmissive}
        emissiveIntensity={emissiveIntensity}
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

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const bicubicFragmentShader = `
  uniform sampler2D map;
  uniform float opacity;
  uniform vec2 textureSize;
  uniform float zoomLevel;

  varying vec2 vUv;

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
    // Use bicubic filtering as base
    vec4 texColor = textureBicubic(map, vUv);

    // Apply blur when zoomed out (zoom closer to 0.15 = more blur)
    // Map zoom range [0.15, 1.0] to blur strength [1.0, 0.0]
    // When zoom = 0.15 (max zoomed out), blurStrength = 1.0
    // When zoom = 1.0 (max zoomed in), blurStrength = 0.0
    float blurStrength = clamp((1.0 - zoomLevel) / (1.0 - 0.15), 0.0, 1.0);

    if (blurStrength > 0.01) {
      // Simple box blur - sample surrounding pixels
      vec2 texelSize = 1.0 / textureSize;
      float blurRadius = blurStrength * 1.65; // Max 1.2 pixels of blur (reduced from 2.0)

      vec4 blurred = vec4(0.0);
      float totalWeight = 0.0;

      // 3x3 blur kernel
      for (float y = -1.0; y <= 1.0; y += 1.0) {
        for (float x = -1.0; x <= 1.0; x += 1.0) {
          vec2 offset = vec2(x, y) * texelSize * blurRadius;
          float weight = 1.0;
          blurred += textureBicubic(map, vUv + offset) * weight;
          totalWeight += weight;
        }
      }

      texColor = blurred / totalWeight;
    }

    // Convert from linear to sRGB for proper color display
    texColor.rgb = pow(texColor.rgb, vec3(1.0 / 2.2));

    gl_FragColor = vec4(texColor.rgb, texColor.a * opacity);
  }
`

// Separate component to handle texture loading
function ImagePlaneMesh({
  imageUrl,
  position,
  width,
  height,
  opacity,
  transparent,
  planeId
}: {
  imageUrl: string
  position: [number, number, number]
  width: number
  height: number
  opacity: number
  transparent: boolean
  emmissive: number
  emissiveIntensity: number
  planeId: string
}) {
  const texture = useTexture(imageUrl)
  const meshRef = useRef<THREE.Mesh>(null)
  const camera = useCamera()

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

  // Create shader material uniforms - initial values only
  const uniforms = useMemo(() => ({
    map: { value: texture },
    opacity: { value: opacity },
    textureSize: { value: textureSize },
    zoomLevel: { value: 0.45 }  // Initial value
  }), [texture, opacity, textureSize])

  // Update zoom uniform every frame using ticker
  useEffect(() => {
    let lastZoom = -1 // Track last zoom to avoid unnecessary updates

    const updateZoom = () => {
      if (meshRef.current) {
        const currentZoom = camera.getState().zoom

        // Only update if zoom actually changed (with small epsilon for floating point)
        if (Math.abs(currentZoom - lastZoom) > 0.001) {
          const material = meshRef.current.material as THREE.ShaderMaterial
          if (material.uniforms && material.uniforms.zoomLevel) {
            material.uniforms.zoomLevel.value = currentZoom
            lastZoom = currentZoom
          }
        }
      }
    }

    ticker.add(updateZoom)

    return () => {
      ticker.remove(updateZoom)
    }
  }, [camera])

  return (
    <mesh ref={meshRef} name={planeId} position={[position[0], -position[1], position[2]]}>
      <planeGeometry args={[width, height]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={bicubicVertexShader}
        fragmentShader={bicubicFragmentShader}
        transparent={transparent || opacity < 1}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

