import { useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { ticker } from '../../../utils/AnimationTicker';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyMaterialOverrides, type MaterialOverride } from '../home/materialUtils';
import type { GameInput } from './types';

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

// UV → game world mapping (CRT shader: tex_uv = (meshUv.y, meshUv.x))
const GAME_VIEW_W = 768 / 20; // 38.4 world units (ortho zoom=20)
const GAME_VIEW_H = 960 / 20; // 48 world units
const NPC_WORLD_POS: [number, number] = [5, -2];
const NPC_CLICK_RADIUS = 7;

function screenUvToWorld(meshUv: { x: number; y: number }, cam: THREE.OrthographicCamera): { x: number; y: number } {
  return {
    x: cam.position.x + (meshUv.y - 0.5) * GAME_VIEW_W,
    y: cam.position.y + (meshUv.x - 0.5) * GAME_VIEW_H,
  };
}

// TV Model - loads tv.glb and applies game texture to screen
export function TVModel({ screenTexture, position = [0, 0, 0] as [number, number, number], scale = 1, materialOverrides = [], gameInputRef, npcInRangeRef, gameCamera, autoWalkRef }: { screenTexture: THREE.Texture; position?: [number, number, number]; scale?: number; materialOverrides?: MaterialOverride[]; gameInputRef?: React.MutableRefObject<GameInput>; npcInRangeRef?: React.MutableRefObject<boolean>; gameCamera?: THREE.OrthographicCamera; autoWalkRef?: React.MutableRefObject<number | null> }) {
  const gltf = useLoader(GLTFLoader, '/tv.glb');
  const { camera: rootCamera, gl } = useThree();
  const screenMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const screenMeshRef = useRef<THREE.Mesh | null>(null);
  const lastTapUvRef = useRef<{ x: number; y: number } | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const pointerVec = useRef(new THREE.Vector2());

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
          screenMeshRef.current = child;
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
          // Disable raycasting so clicks/hovers pass through to the screen mesh behind
          child.raycast = () => {};
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

  // Game input: click on TV to start drag, tap to interact (Enter)
  const isHoveredRef = useRef(false);

  // Helper: raycast pointer against screen mesh, return UV if hit
  const raycastScreenUv = useCallback((e: PointerEvent): { x: number; y: number } | null => {
    const mesh = screenMeshRef.current;
    if (!mesh) return null;
    const rect = gl.domElement.getBoundingClientRect();
    pointerVec.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerVec.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(pointerVec.current, rootCamera);
    const hits = raycasterRef.current.intersectObject(mesh);
    return (hits.length > 0 && hits[0].uv) ? { x: hits[0].uv.x, y: hits[0].uv.y } : null;
  }, [gl, rootCamera]);

  // Check if a UV coordinate is near the NPC
  const isNpcArea = useCallback((uv: { x: number; y: number }): boolean => {
    if (!gameCamera) return false;
    const world = screenUvToWorld(uv, gameCamera);
    const dx = world.x - NPC_WORLD_POS[0];
    const dy = world.y - NPC_WORLD_POS[1];
    return Math.sqrt(dx * dx + dy * dy) < NPC_CLICK_RADIUS;
  }, [gameCamera]);

  useEffect(() => {
    if (!gameInputRef) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (gameInputRef.current.active) {
        // Drag tracking (X + Y)
        gameInputRef.current.currentX = e.clientX;
        gameInputRef.current.currentY = e.clientY;
        const dx = Math.abs(e.clientX - gameInputRef.current.startX);
        if (dx > gameInputRef.current.maxDx) {
          gameInputRef.current.maxDx = dx;
        }
        return;
      }
      // Hover cursor: check if pointer is over the NPC area on the screen
      if (isHoveredRef.current) {
        const uv = raycastScreenUv(e);
        if (uv && isNpcArea(uv)) {
          document.body.style.cursor = 'pointer';
        } else {
          document.body.style.cursor = 'grab';
        }
      }
    };

    const dispatchEnter = () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      setTimeout(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })), 50);
    };

    const handlePointerUp = () => {
      if (!gameInputRef.current.active) return;
      const elapsed = Date.now() - gameInputRef.current.startTime;
      if (gameInputRef.current.maxDx < 10 && elapsed < 300) {
        if (npcInRangeRef?.current) {
          // Dialogue already active — tap to advance/close
          dispatchEnter();
        } else if (lastTapUvRef.current && isNpcArea(lastTapUvRef.current)) {
          // Tap on NPC area — auto-walk player to NPC and interact on arrival
          if (autoWalkRef) autoWalkRef.current = NPC_WORLD_POS[0];
        }
      }
      gameInputRef.current.active = false;
      document.body.style.cursor = isHoveredRef.current ? 'grab' : '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gameInputRef, npcInRangeRef, gameCamera, raycastScreenUv, isNpcArea]);

  const handleTVPointerDown = useCallback((e: any) => {
    if (!gameInputRef) return;
    e.stopPropagation();
    gameInputRef.current.active = true;
    gameInputRef.current.startX = e.clientX ?? 0;
    gameInputRef.current.currentX = gameInputRef.current.startX;
    gameInputRef.current.startY = e.clientY ?? 0;
    gameInputRef.current.currentY = gameInputRef.current.startY;
    gameInputRef.current.maxDx = 0;
    gameInputRef.current.startTime = Date.now();
    document.body.style.cursor = 'grabbing';
    // Store UV if tap hit the screen mesh (for NPC click detection)
    lastTapUvRef.current = (e.object === screenMeshRef.current && e.uv)
      ? { x: e.uv.x, y: e.uv.y }
      : null;
  }, [gameInputRef]);

  const handleTVPointerOver = useCallback(() => {
    isHoveredRef.current = true;
    if (!gameInputRef?.current.active) {
      document.body.style.cursor = 'grab';
    }
  }, [gameInputRef]);

  const handleTVPointerOut = useCallback(() => {
    isHoveredRef.current = false;
    if (!gameInputRef?.current.active) {
      document.body.style.cursor = '';
    }
  }, [gameInputRef]);

  return (
    <primitive
      object={gltf.scene}
      position={position}
      scale={scale}
      onPointerDown={handleTVPointerDown}
      onPointerOver={handleTVPointerOver}
      onPointerOut={handleTVPointerOut}
    />
  );
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
    footTexture.minFilter = THREE.LinearMipmapLinearFilter;
    footTexture.magFilter = THREE.LinearFilter;
    footTexture.anisotropy = 16;
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
