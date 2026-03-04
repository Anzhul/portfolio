import { useLoader, useThree } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { ticker } from '../../../utils/AnimationTicker';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyMaterialOverrides, type MaterialOverride } from '../home/materialUtils';
import type { GameInput } from './types';
import { useSceneVisible } from '../SceneVisibilityContext';
import { useViewport } from '../../../context/ViewportContext';
import { useScroll } from '../../../context/ScrollContext';

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
  uniform float turnOn; // 0 = off, 0→1 animates turn-on, 1 = fully on
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

    // --- TV turn-on effect ---
    if (turnOn < 1.0) {
      // Phase 1 (0.0–0.15): black screen
      if (turnOn < 0.15) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }
      // Phase 2 (0.15–0.3): white line expands from center
      if (turnOn < 0.3) {
        float t = (turnOn - 0.15) / 0.15;
        float halfH = t * 0.5;
        float dist = abs(uv.y - 0.5);
        float brightness = smoothstep(halfH, halfH - 0.01, dist);
        gl_FragColor = vec4(vec3(brightness), 1.0);
        return;
      }
    }

    // --- Normal CRT rendering (turnOn >= 1.0) ---
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
export function TVModel({ screenTexture, position = [0, 0, 0] as [number, number, number], scale = 1, materialOverrides = [], gameInputRef, npcInRangeRef, gameCamera, autoWalkRef, turnOnRef }: { screenTexture: THREE.Texture; position?: [number, number, number]; scale?: number; materialOverrides?: MaterialOverride[]; gameInputRef?: React.MutableRefObject<GameInput>; npcInRangeRef?: React.MutableRefObject<boolean>; gameCamera?: THREE.OrthographicCamera; autoWalkRef?: React.MutableRefObject<number | null>; turnOnRef?: React.MutableRefObject<number> }) {
  const gltf = useLoader(GLTFLoader, '/about/tv.glb');
  const { camera: rootCamera, gl } = useThree();
  const isVisible = useSceneVisible();
  const { isTabletDown } = useViewport();
  const scroll = useScroll();
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
        child.castShadow = true;
        const meshName = (child.name || '').toLowerCase();
        const matName = (child.material?.name || '').toLowerCase();
        if (meshName.includes('screen') || matName.includes('screen')) {
          const mat = new THREE.ShaderMaterial({
            uniforms: {
              map: { value: screenTexture },
              time: { value: 0 },
              emissiveIntensity: { value: 1.5 },
              turnOn: { value: 0 },
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
            depthWrite: false,
            depthTest: false,
            roughness: 0.05,
            metalness: 0,
            ior: 1.5,
            thickness: 0.5,
            color: 0xd8e0ff,
          });
          child.renderOrder = 1;
          // Disable raycasting so clicks/hovers pass through to the screen mesh behind
          child.raycast = () => {};
        }
      }
    });
  }, [gltf, screenTexture, materialOverrides, isTabletDown]);

  // Animate the time uniform for noise variation
  useEffect(() => {
    if (!isVisible) return;

    const update = () => {
      if (screenMaterialRef.current) {
        screenMaterialRef.current.uniforms.time.value = performance.now() * 0.001;
        screenMaterialRef.current.uniforms.turnOn.value = turnOnRef?.current ?? 1;
      }
      // Sync cursor when camera scrolls in/out of TV interaction zone
      const { smoothProgress } = scroll.getState();
      const camP = Math.min(1, smoothProgress / 0.75);
      const inZone = camP > 0.15 && camP < 0.9;
      if (!inZone && isHoveredRef.current) {
        isHoveredRef.current = false;
        document.body.style.cursor = '';
      } else if (inZone && isHoveredRef.current && !gameInputRef?.current.active && document.body.style.cursor === '') {
        document.body.style.cursor = 'grab';
      }
    };
    ticker.add(update);
    return () => ticker.remove(update);
  }, [isVisible, turnOnRef, scroll, gameInputRef]);

  // Prevent browser from stealing touches on the TV for scrolling.
  // R3F sets pointer-events:none on the canvas when eventSource is used,
  // so touches land on the eventSource (scroll container), not the canvas.
  // We listen on that element and preventDefault when the touch hits the TV.
  // Only active when scroll is near the top (hero area visible).
  const { events } = useThree();
  useEffect(() => {
    if (!isTabletDown || !isVisible) return;

    // events.connected is the eventSource element R3F listens on
    const target = events.connected as HTMLElement | undefined;
    if (!target) return;
    const canvas = gl.domElement;

    const handleTouchStart = (e: TouchEvent) => {
      // Only intercept touches when TV is in view (first half of camera tour)
      const { progress } = scroll.getState();
      if (progress > 0.5) return;

      const touch = e.touches[0];
      if (!touch) return;
      const rect = canvas.getBoundingClientRect();
      pointerVec.current.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      pointerVec.current.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera(pointerVec.current, rootCamera);
      const hits = raycasterRef.current.intersectObject(gltf.scene, true);
      if (hits.length > 0) {
        e.preventDefault();
      }
    };

    target.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => target.removeEventListener('touchstart', handleTouchStart);
  }, [gl, events, rootCamera, gltf, isTabletDown, isVisible, scroll]);

  // Check if camera is in the TV interaction zone (matches FBO render range)
  const isTvInteractive = useCallback(() => {
    const { smoothProgress } = scroll.getState();
    const camP = Math.min(1, smoothProgress / 0.75);
    return camP > 0.15 && camP < 0.9;
  }, [scroll]);

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
    if (!gameInputRef || !isVisible) return;

    const handlePointerMove = (e: PointerEvent) => {
      if (gameInputRef.current.active) {
        const dx = Math.abs(e.clientX - gameInputRef.current.startX);
        // Drag tracking (X + Y)
        gameInputRef.current.currentX = e.clientX;
        gameInputRef.current.currentY = e.clientY;
        if (dx > gameInputRef.current.maxDx) {
          gameInputRef.current.maxDx = dx;
        }
        return;
      }
      // Hover cursor: check if pointer is over the NPC area on the screen
      if (isHoveredRef.current && isTvInteractive()) {
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

    // Reset state when browser cancels touch (e.g. scroll takeover)
    const handlePointerCancel = () => {
      gameInputRef.current.active = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [gameInputRef, npcInRangeRef, gameCamera, raycastScreenUv, isNpcArea, isVisible]);

  const handleTVPointerDown = useCallback((e: any) => {
    if (!gameInputRef || !isTvInteractive()) return;
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
    if (!gameInputRef?.current.active && isTvInteractive()) {
      document.body.style.cursor = 'grab';
    }
  }, [gameInputRef, isTvInteractive]);

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
  const gltf = useLoader(GLTFLoader, '/about/plate.glb');
  const orangeTexture = useLoader(TextureLoader, '/about/Orange.png');
  const isVisible = useSceneVisible();
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
            mat.roughness = 0.9;
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

    // Capture pointer so the browser doesn't hijack touch events for scrolling
    // and all subsequent move events are delivered even if finger leaves the mesh
    const ne = e.nativeEvent as PointerEvent | undefined;
    if (ne?.pointerId !== undefined && ne.target instanceof Element) {
      try { ne.target.setPointerCapture(ne.pointerId); } catch (_) {}
    }
  }, []);

  // Window-level listeners for drag tracking (user may drag outside mesh)
  useEffect(() => {
    if (!isVisible) return;

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
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.cursor = '';
    };
  }, [isVisible]);

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

// Frame Model - loads frame.glb manually (no useLoader/Suspense) and applies a texture.
// Uses MeshToonMaterial to stay consistent with the gallery scene.
export function FrameModel({ position = [0, 0, 0] as [number, number, number], scale = 1, rotation = [0, 0, 0] as [number, number, number], imageTexture }: { position?: [number, number, number]; scale?: number; rotation?: [number, number, number]; imageTexture?: THREE.Texture }) {
  const [scene, setScene] = useState<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new GLTFLoader();
    loader.load('/about/frame.glb', (gltf) => {
      if (cancelled) return;

      // glTF UVs expect flipY=false; safe to set on the shared texture since only FrameModel uses it
      if (imageTexture) {
        imageTexture.flipY = false;
        imageTexture.center.set(0.5, 0.5);
        imageTexture.rotation = Math.PI / 2;
        imageTexture.needsUpdate = true;
      }

      gltf.scene.traverse((child: any) => {
        if (!child.isMesh) return;

        // The image quad has 4 vertices; the frame body has 276.
        // Use vertex count to reliably identify which mesh gets the texture.
        const vertexCount = child.geometry?.attributes?.position?.count ?? 0;
        if (vertexCount <= 4 && imageTexture) {
          child.material = new THREE.MeshToonMaterial({ map: imageTexture, side: THREE.DoubleSide });
          // Flat image quad should not cast shadows — it has zero thickness
          // and produces shadow artifacts
          child.castShadow = false;
        } else {
          child.material = new THREE.MeshToonMaterial({ color: '#ffd47d', side: THREE.DoubleSide });
          child.castShadow = true;
        }
      });

      setScene(gltf.scene);
    });

    return () => { cancelled = true; };
  }, [imageTexture]);

  if (!scene) return null;

  return (
    <primitive
      object={scene}
      position={position}
      scale={scale}
      rotation={rotation}
    />
  );
}

// Vase Model - loads Vase.glb and applies vase_body.png / vase_foot.png
// Supports grab cursor on hover and drag-to-rotate interaction
export function VaseModel({ position = [0, 0, 0] as [number, number, number], scale = 1 }: { position?: [number, number, number]; scale?: number }) {
  const gltf = useLoader(GLTFLoader, '/about/Vase.glb');
  const bodyTexture = useLoader(TextureLoader, '/about/vase_body.png');
  const footTexture = useLoader(TextureLoader, '/about/vase_foot.png');
  const isVisible = useSceneVisible();
  const { gl, camera: rootCamera, events } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const isDragging = useRef(false);
  const isHovered = useRef(false);
  const prevX = useRef(0);
  const raycaster = useRef(new THREE.Raycaster());
  const pointerVec2 = useRef(new THREE.Vector2());

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
      child.castShadow = true;

      const replaceMaterial = (mat: THREE.Material, index?: number) => {
        const name = (mat.name || '').toLowerCase();
        let toonMat: THREE.MeshToonMaterial;

        if (name === 'body') {
          toonMat = new THREE.MeshToonMaterial({ map: bodyTexture, color: '#e8e8ff' });
        } else if (name === 'foot') {
          toonMat = new THREE.MeshToonMaterial({ map: footTexture, color: '#e8e8ff' });
        } else if (name === 'rim') {
          toonMat = new THREE.MeshToonMaterial({ color: '#ddc17b' });
        } else if (name === 'default') {
          toonMat = new THREE.MeshToonMaterial({ color: '#f5f5f0' });
        } else {
          return;
        }
        toonMat.name = mat.name;

        if (Array.isArray(child.material) && index !== undefined) {
          child.material[index] = toonMat;
        } else {
          child.material = toonMat;
        }
        mat.dispose();
      };

      if (Array.isArray(child.material)) {
        child.material.forEach((mat: THREE.Material, i: number) => replaceMaterial(mat, i));
      } else {
        replaceMaterial(child.material);
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

    // Capture pointer so move events are delivered even if finger leaves the mesh
    const ne = e.nativeEvent as PointerEvent | undefined;
    if (ne?.pointerId !== undefined && ne.target instanceof Element) {
      try { ne.target.setPointerCapture(ne.pointerId); } catch (_) {}
    }
  }, []);

  // Prevent browser from stealing touches on the vase for scrolling.
  // Without this, touchstart triggers scroll which fires pointercancel,
  // killing the drag after a small increment.
  useEffect(() => {
    if (!isVisible) return;

    const target = events.connected as HTMLElement | undefined;
    if (!target) return;
    const canvas = gl.domElement;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch || !groupRef.current) return;
      const rect = canvas.getBoundingClientRect();
      pointerVec2.current.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      pointerVec2.current.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.current.setFromCamera(pointerVec2.current, rootCamera);
      const hits = raycaster.current.intersectObject(groupRef.current, true);
      if (hits.length > 0) {
        e.preventDefault();
      }
    };

    target.addEventListener('touchstart', handleTouchStart, { passive: false });
    return () => target.removeEventListener('touchstart', handleTouchStart);
  }, [gl, events, rootCamera, isVisible]);

  // Window-level listeners for drag tracking (user may drag outside mesh)
  useEffect(() => {
    if (!isVisible) return;

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
    window.addEventListener('pointercancel', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.cursor = '';
    };
  }, [isVisible]);

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
