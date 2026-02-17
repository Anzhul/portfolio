import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { ticker } from '../../../utils/AnimationTicker';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyMaterialOverrides, type MaterialOverride } from '../home/materialUtils';

// CRT screen shader
export const crtVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const crtFragmentShader = `
  uniform sampler2D map;
  uniform float time;
  uniform float emissiveIntensity;
  varying vec2 vUv;

  // Pseudo-random noise
  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    // Apply UV transform: rotate -90deg around center, then flip horizontally
    // (replicates texture.rotation = -PI/2, repeat.set(-1,1), center(0.5,0.5))
    vec2 centered = vUv - 0.5;
    vec2 rotated = vec2(-centered.y, centered.x); // -90 deg rotation
    vec2 uv = vec2(-rotated.x, rotated.y) + 0.5;  // flip X + uncenter

    // Subtle scanlines
    float scanline = sin(uv.y * 400.0) * 0.01;

    // Slight chromatic aberration
    float offset = 0.002;
    float r = texture2D(map, uv + vec2(offset, 0.0)).r;
    float g = texture2D(map, uv).g;
    float b = texture2D(map, uv - vec2(offset, 0.0)).b;
    vec3 color = vec3(r, g, b);

    // Noise grain
    float noise = rand(uv + fract(time)) * 0.06;

    // Combine: base color + emissive boost + scanlines + noise
    vec3 emissive = color * emissiveIntensity;
    vec3 final = emissive - scanline + noise;

    gl_FragColor = vec4(final, 1.0);
  }
`;

// TV Model - loads tv.glb and applies game texture to screen
export function TVModel({ screenTexture, position = [0, 0, 0] as [number, number, number], scale = 1, materialOverrides = [] }: { screenTexture: THREE.Texture; position?: [number, number, number]; scale?: number; materialOverrides?: MaterialOverride[] }) {
  const gltf = useLoader(GLTFLoader, '/tv.glb');
  const screenMaterialRef = useRef<THREE.ShaderMaterial | null>(null);

  useEffect(() => {
    screenTexture.center.set(0.5, 0.5);
    screenTexture.rotation = -Math.PI / 2;
    screenTexture.repeat.set(-1, 1);
    screenTexture.wrapS = THREE.RepeatWrapping;

    // Apply material overrides
    if (materialOverrides.length > 0) {
      applyMaterialOverrides(gltf.scene, materialOverrides);
    }

    // Apply screen texture and glass material
    gltf.scene.traverse((child: any) => {
      if (child.isMesh) {
        const meshName = (child.name || '').toLowerCase();
        const matName = (child.material?.name || '').toLowerCase();
        if (meshName.includes('screen') || matName.includes('screen')) {
          const mat = new THREE.ShaderMaterial({
            uniforms: {
              map: { value: screenTexture },
              time: { value: 0 },
              emissiveIntensity: { value: 1.5 },
            },
            vertexShader: crtVertexShader,
            fragmentShader: crtFragmentShader,
            toneMapped: false,
          });
          child.material = mat;
          screenMaterialRef.current = mat;
        } else if (meshName.includes('glass') || matName.includes('glass')) {
          child.material = new THREE.MeshPhysicalMaterial({
            transmission: 1,
            transparent: true,
            roughness: 0.05,
            metalness: 0,
            ior: 1.5,
            thickness: 0.5,
            color: 0xd8e0ff,
          });
        }
      }
    });
  }, [gltf, screenTexture, materialOverrides]);

  // Animate the time uniform for noise variation
  useEffect(() => {
    const update = () => {
      if (screenMaterialRef.current) {
        screenMaterialRef.current.uniforms.time.value = performance.now() * 0.001;
      }
    };
    ticker.add(update);
    return () => ticker.remove(update);
  }, []);

  return <primitive object={gltf.scene} position={position} scale={scale} />;
}

// Plate Model - loads plate.glb and applies Orange.png to fruit slices
// Supports grab cursor on hover and drag-to-rotate interaction
export function PlateModel({ position = [0, 0, 0] as [number, number, number], scale = 1 }: { position?: [number, number, number]; scale?: number }) {
  const gltf = useLoader(GLTFLoader, '/plate.glb');
  const orangeTexture = useLoader(TextureLoader, '/Orange.png');
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const isHovered = useRef(false);
  const prevX = useRef(0);

  // Compute bounding box center so rotation is around the visual center
  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    return [-center.x, 0, -center.z] as [number, number, number];
  }, [gltf]);

  useEffect(() => {
    orangeTexture.flipY = false;
    orangeTexture.needsUpdate = true;

    gltf.scene.traverse((child: any) => {
      if (child.isMesh) {
        const name = (child.name || '').toLowerCase();
        if (name.includes('grapefruit') || name.includes('slice')) {
          const mat = child.material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.map = orangeTexture;
            mat.color.set('#ffe8c8');
            mat.emissive.set('#ff8c40');
            mat.emissiveIntensity = 0.15;
            mat.roughness = 0.6;
            mat.metalness = 0.0;
            mat.needsUpdate = true;
          } else {
            child.material = new THREE.MeshStandardMaterial({
              map: orangeTexture,
              color: '#ffe4bc',
              emissive: '#ff8c40',
              emissiveIntensity: 0.15,
              roughness: 0.6,
              metalness: 0.0,
            });
          }
        } else {
          const mat = child.material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.color.set('#e5e9f7');
            mat.roughness = 0.15;
            mat.metalness = 0.0;
            mat.needsUpdate = true;
          }
        }
      }
    });
  }, [gltf, orangeTexture]);

  const handlePointerOver = useCallback(() => {
    isHovered.current = true;
    if (!isDragging.current) {
      document.body.style.cursor = 'grab';
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    isHovered.current = false;
    if (!isDragging.current) {
      document.body.style.cursor = '';
    }
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    prevX.current = e.clientX ?? 0;
    document.body.style.cursor = 'grabbing';
  }, []);

  // Window-level listeners for drag tracking (user may drag outside mesh)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !groupRef.current) return;
      const deltaX = e.clientX - prevX.current;
      groupRef.current.rotation.y += deltaX * 0.01;
      prevX.current = e.clientX;
    };

    const handlePointerUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = isHovered.current ? 'grab' : '';
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
    >
      <primitive object={gltf.scene} position={centerOffset} />
    </group>
  );
}

// Vase Model - loads Vase.glb and applies vase_body.png / vase_foot.png
// Supports grab cursor on hover and drag-to-rotate interaction
export function VaseModel({ position = [0, 0, 0] as [number, number, number], scale = 1 }: { position?: [number, number, number]; scale?: number }) {
  const gltf = useLoader(GLTFLoader, '/Vase.glb');
  const bodyTexture = useLoader(TextureLoader, '/vase_body.png');
  const footTexture = useLoader(TextureLoader, '/vase_foot.png');
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const isHovered = useRef(false);
  const prevX = useRef(0);

  // Compute bounding box center so rotation is around the visual center
  const centerOffset = useMemo(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const center = box.getCenter(new THREE.Vector3());
    return [-center.x, 0, -center.z] as [number, number, number];
  }, [gltf]);

  useEffect(() => {
    bodyTexture.flipY = false;
    bodyTexture.minFilter = THREE.LinearMipmapLinearFilter;
    bodyTexture.magFilter = THREE.LinearFilter;
    bodyTexture.anisotropy = 16;
    bodyTexture.needsUpdate = true;
    footTexture.flipY = false;
    footTexture.needsUpdate = true;

    // Single mesh with multi-material: child.material may be an array
    gltf.scene.traverse((child: any) => {
      if (!child.isMesh) return;

      const applyTexture = (mat: THREE.Material) => {
        const name = (mat.name || '').toLowerCase();
        if (mat instanceof THREE.MeshStandardMaterial) {
          if (name === 'body') {
            mat.map = bodyTexture;
            mat.color.set('#e8e8ff');
            mat.roughness = 0.1;
            mat.metalness = 0.05;
            mat.envMapIntensity = 1;
            mat.needsUpdate = true;
          } else if (name === 'foot') {
            mat.map = footTexture;
            mat.color.set('#e8e8ff');
            mat.roughness = 0.15;
            mat.metalness = 0.05;
            mat.envMapIntensity = 1.5;
            mat.needsUpdate = true;
          } else if (name === 'rim') {
            mat.color.set('#ddc17b');
            mat.roughness = 0.1;
            mat.metalness = 0.1;
            mat.envMapIntensity = 1.5;
            mat.needsUpdate = true;
          } else if (name === 'default') {
            mat.color.set('#f5f5f0');
            mat.roughness = 0.15;
            mat.metalness = 0.05;
            mat.envMapIntensity = 1.5;
            mat.needsUpdate = true;
          }
        }
      };

      if (Array.isArray(child.material)) {
        child.material.forEach(applyTexture);
      } else {
        applyTexture(child.material);
      }
    });
  }, [gltf, bodyTexture, footTexture]);

  const handlePointerOver = useCallback(() => {
    isHovered.current = true;
    if (!isDragging.current) {
      document.body.style.cursor = 'grab';
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    isHovered.current = false;
    if (!isDragging.current) {
      document.body.style.cursor = '';
    }
  }, []);

  const handlePointerDown = useCallback((e: any) => {
    e.stopPropagation();
    isDragging.current = true;
    prevX.current = e.clientX ?? 0;
    document.body.style.cursor = 'grabbing';
  }, []);

  // Window-level listeners for drag tracking (user may drag outside mesh)
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging.current || !groupRef.current) return;
      const deltaX = e.clientX - prevX.current;
      groupRef.current.rotation.y += deltaX * 0.01;
      prevX.current = e.clientX;
    };

    const handlePointerUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = isHovered.current ? 'grab' : '';
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      document.body.style.cursor = '';
    };
  }, []);

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
    >
      <primitive object={gltf.scene} position={centerOffset} />
    </group>
  );
}
