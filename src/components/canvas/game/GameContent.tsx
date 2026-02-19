import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { useMemo, useEffect, useRef, useState } from 'react';
import { ticker } from '../../../utils/AnimationTicker';
import type { Tile, TileMapData, LayerPlaneProps, PhysicsPlayerProps } from './types';
import { NostalgiaDialogue } from './GameDialogue';

// Import all Z layer JSON files
import Z0Data from '../../../data/Z0.json';
import Z1Data from '../../../data/Z1 (Collision).json';
import Z2Data from '../../../data/Z2.json';
import Z3Data from '../../../data/Z3.json';
import Z4Data from '../../../data/Z4.json';
import Z5Data from '../../../data/Z5.json';
import Z6Data from '../../../data/Z6.json';

// Render an entire Z layer as a single plane
function LayerPlane({ layerData, zIndex, spritesheetTexture, tilesPerRow, position, parallaxFactor, playerPositionRef }: LayerPlaneProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const meshRef = useRef<THREE.Mesh>(null!);

  const layerTexture = useMemo(() => {
    // Create a canvas to composite all tiles for this layer
    const canvas = document.createElement('canvas');
    const tileSize = layerData.tileSize;
    canvas.width = layerData.mapWidth * tileSize;
    canvas.height = layerData.mapHeight * tileSize;
    const ctx = canvas.getContext('2d', { willReadFrequently: false });

    if (!ctx) return null;

    // Clear with transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const spriteImage = spritesheetTexture.image as HTMLImageElement;

    // Draw all tiles from all layers in this Z level
    layerData.layers.forEach(layer => {
      layer.tiles.forEach(tile => {
        const tileId = parseInt(tile.id);
        const spriteX = (tileId % tilesPerRow) * tileSize;
        const spriteY = Math.floor(tileId / tilesPerRow) * tileSize;

        // Draw tile at its position
        ctx.drawImage(
          spriteImage,
          spriteX, spriteY, tileSize, tileSize,
          tile.x * tileSize, tile.y * tileSize, tileSize, tileSize
        );
      });
    });

    canvasRef.current = canvas;

    // Create texture from canvas
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    return texture;
  }, [layerData, spritesheetTexture, tilesPerRow]);

  // Dispose texture and canvas on unmount to free GPU + bitmap memory
  useEffect(() => {
    return () => {
      if (layerTexture) {
        layerTexture.dispose();
      }
      if (canvasRef.current) {
        canvasRef.current.width = 0;
        canvasRef.current.height = 0;
        canvasRef.current = null;
      }
    };
  }, [layerTexture]);

  if (!layerTexture) return null;

  const pixelSize = 0.1;
  const planeWidth = layerData.mapWidth * layerData.tileSize * pixelSize;
  const planeHeight = layerData.mapHeight * layerData.tileSize * pixelSize;

  // Apply parallax effect based on player position
  useEffect(() => {
    const updateParallax = () => {
      if (meshRef.current) {
        // Calculate parallax offset based on player position and layer depth
        const parallaxX = position[0] + (playerPositionRef.current.x * (1 - parallaxFactor));
        const parallaxY = position[1] + (playerPositionRef.current.y * (1 - parallaxFactor));

        meshRef.current.position.set(parallaxX, parallaxY, position[2]);
      }
    };

    ticker.add(updateParallax);
    return () => ticker.remove(updateParallax);
  }, [position, parallaxFactor, playerPositionRef, zIndex]);

  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={[planeWidth, planeHeight]} />
      <meshBasicMaterial
        map={layerTexture}
        transparent
        alphaTest={0.01}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// Physics Player with collision detection
function PhysicsPlayer({ collisionTiles, collisionPosition, tileSize, pixelSize, mapWidth, mapHeight, playerPositionRef, gameCamera, gameViewportWidth, gameInputRef, autoWalkRef, npcInRangeRef }: PhysicsPlayerProps) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const velocityRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({ left: false, right: false, up: false });
  const pointerKeysRef = useRef({ left: false, right: false });
  const boundsRef = useRef({ minX: -Infinity, maxX: Infinity });

  // Initialize mesh position from ref
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(playerPositionRef.current);
    }
  }, [playerPositionRef]);

  // Player constants
  const playerSize = 6.2;
  const moveSpeed = 0.4;
  const gravity = -0.02;
  const isGroundedRef = useRef(false);

  // Load player sprites
  const idleTexture = useLoader(TextureLoader, '/footer-env/Player_sprite.png');
  const runTextures = useLoader(TextureLoader, [
    '/footer-env/run/Player_run.png',
    '/footer-env/run/Player_run1.png',
    '/footer-env/run/Player_run2.png',
    '/footer-env/run/Player_run3.png',
    '/footer-env/run/Player_run4.png',
    '/footer-env/run/Player_run5.png',
    '/footer-env/run/Player_run6.png',
    '/footer-env/run/Player_run7.png',
    '/footer-env/run/Player_run8.png',
    '/footer-env/run/Player_run9.png',
    '/footer-env/run/Player_run10.png',
    '/footer-env/run/Player_run11.png',
    '/footer-env/run/Player_run12.png',
  ]);

  const [currentTexture, setCurrentTexture] = useState<THREE.Texture>(idleTexture);
  const animationFrameRef = useRef(0);
  const animationTimerRef = useRef(0);
  const facingRightRef = useRef(true);
  const hasCompletedFirstCycleRef = useRef(false);
  const isRunningRef = useRef(false);

  // Configure texture filtering for pixel art
  useEffect(() => {
    [idleTexture, ...runTextures].forEach(texture => {
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
    });
  }, [idleTexture, runTextures]);

  // Calculate plane dimensions (planes are centered at their position)
  const planeWidth = mapWidth * tileSize * pixelSize;
  const planeHeight = mapHeight * tileSize * pixelSize;

  // Calculate and store collision bounds
  useEffect(() => {
    if (collisionTiles.length === 0) return;

    let minX = Infinity;
    let maxX = -Infinity;

    collisionTiles.forEach(tile => {
      const tileWorldX = collisionPosition[0] - planeWidth / 2 + (tile.x * tileSize * pixelSize);
      if (tileWorldX < minX) minX = tileWorldX;
      if (tileWorldX + (tileSize * pixelSize) > maxX) maxX = tileWorldX + (tileSize * pixelSize);
    });

    boundsRef.current = { minX, maxX };
  }, [collisionTiles, collisionPosition, planeWidth, tileSize, pixelSize]);

  // Build spatial grid for O(1) collision lookups instead of iterating all 2k+ tiles
  const collisionGrid = useMemo(() => {
    const grid = new Set<string>();
    collisionTiles.forEach(tile => grid.add(`${tile.x},${tile.y}`));
    return grid;
  }, [collisionTiles]);

  // Check collision using spatial grid
  const checkCollision = (x: number, y: number, checkingHorizontal: boolean = false): boolean => {
    const playerLeft = x - playerSize / 2;
    const playerRight = x + playerSize / 2;

    const playerTop = checkingHorizontal ? (y + playerSize * 0.3) : (y + playerSize / 2);
    const playerBottom = checkingHorizontal ? (y - playerSize * 0.1) : (y - playerSize / 2);

    const tileSizeWorld = tileSize * pixelSize;
    const offsetX = collisionPosition[0] - planeWidth / 2;
    const offsetY = collisionPosition[1] + planeHeight / 2;

    const tileXMin = Math.floor((playerLeft - offsetX) / tileSizeWorld);
    const tileXMax = Math.floor((playerRight - offsetX) / tileSizeWorld);
    const tileYMin = Math.floor((offsetY - playerTop) / tileSizeWorld);
    const tileYMax = Math.floor((offsetY - playerBottom) / tileSizeWorld);

    for (let tx = tileXMin; tx <= tileXMax; tx++) {
      for (let ty = tileYMin; ty <= tileYMax; ty++) {
        if (!collisionGrid.has(`${tx},${ty}`)) continue;

        const tileWorldX = offsetX + tx * tileSizeWorld;
        const tileWorldY = offsetY - ty * tileSizeWorld;
        const tileRight = tileWorldX + tileSizeWorld;
        const tileBottom = tileWorldY - tileSizeWorld;

        if (checkingHorizontal) {
          const tileCenterX = tileWorldX + tileSizeWorld / 2;
          const tileCenterY = tileWorldY - tileSizeWorld / 2;
          const isBelowPlayer = tileCenterY < (y - playerSize * 0.4);
          const isAtPlayerX = Math.abs(tileCenterX - x) < playerSize * 0.6;
          if (isBelowPlayer && isAtPlayerX) continue;
        }

        if (playerRight > tileWorldX && playerLeft < tileRight && playerTop > tileBottom && playerBottom < tileWorldY) {
          return true;
        }
      }
    }
    return false;
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') keysRef.current.up = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === ' ') keysRef.current.up = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Pointer input from TV clicks (read in physics loop)

  // Physics update loop
  useEffect(() => {
    const updatePhysics = () => {
      if (!meshRef.current) return;

      // Freeze player during dialogue/battle
      if (npcInRangeRef?.current) {
        velocityRef.current.x = 0;
        pointerKeysRef.current = { left: false, right: false };

        // Still apply gravity so player doesn't float
        velocityRef.current.y += gravity;
        if (velocityRef.current.y < -1) velocityRef.current.y = -1;
        const pos = meshRef.current.position;
        const newY = pos.y + velocityRef.current.y;
        if (checkCollision(pos.x, newY, false)) {
          velocityRef.current.y = 0;
        } else {
          pos.y = newY;
          playerPositionRef.current.y = newY;
        }

        // Show idle sprite
        if (isRunningRef.current) {
          isRunningRef.current = false;
          setCurrentTexture(idleTexture);
        }
        return;
      }

      // Update pointer-driven movement from TV drag
      if (gameInputRef?.current?.active) {
        const diff = gameInputRef.current.currentX - gameInputRef.current.startX;
        const threshold = 20;
        if (diff > threshold) {
          pointerKeysRef.current = { left: false, right: true };
        } else if (diff < -threshold) {
          pointerKeysRef.current = { left: true, right: false };
        } else {
          pointerKeysRef.current = { left: false, right: false };
        }
      } else {
        pointerKeysRef.current = { left: false, right: false };
      }

      // Auto-walk toward target (set when user taps NPC on TV)
      let autoWalkLeft = false;
      let autoWalkRight = false;
      if (autoWalkRef?.current !== null && autoWalkRef?.current !== undefined) {
        // Cancel auto-walk if user provides manual input
        if (gameInputRef?.current?.active || keysRef.current.left || keysRef.current.right) {
          autoWalkRef.current = null;
        } else {
          const distToTarget = autoWalkRef.current - meshRef.current.position.x;
          if (Math.abs(distToTarget) > 2) {
            if (distToTarget > 0) autoWalkRight = true;
            else autoWalkLeft = true;
          }
          // Don't clear ref here — NostalgiaDialogue clears it when dialogue starts
        }
      }

      const leftPressed = keysRef.current.left || pointerKeysRef.current.left || autoWalkLeft;
      const rightPressed = keysRef.current.right || pointerKeysRef.current.right || autoWalkRight;

      const currentPos = meshRef.current.position;

      // Calculate camera boundaries
      const halfWidth = gameViewportWidth / 2;
      const cameraLeftEdge = gameCamera.position.x - halfWidth;
      const cameraRightEdge = gameCamera.position.x + halfWidth;
      const { minX, maxX } = boundsRef.current;

      // Horizontal movement
      if (leftPressed) {
        if (cameraLeftEdge > minX + 5) {
          velocityRef.current.x = -moveSpeed;
          facingRightRef.current = false;
        } else {
          velocityRef.current.x = 0;
        }
      } else if (rightPressed) {
        if (cameraRightEdge < maxX - 5) {
          velocityRef.current.x = moveSpeed;
          facingRightRef.current = true;
        } else {
          velocityRef.current.x = 0;
        }
      } else {
        velocityRef.current.x *= 0.8;
      }

      // Apply gravity
      velocityRef.current.y += gravity;

      // Clamp falling speed
      if (velocityRef.current.y < -1) {
        velocityRef.current.y = -1;
      }

      // Calculate new position
      let newX = currentPos.x + velocityRef.current.x;
      let newY = currentPos.y + velocityRef.current.y;

      // Check vertical collision (with all tiles)
      if (checkCollision(currentPos.x, newY, false)) {
        if (velocityRef.current.y < 0) {
          isGroundedRef.current = true;
        }
        newY = currentPos.y;
        velocityRef.current.y = 0;
      } else {
        isGroundedRef.current = false;
      }

      // Update sprite animation
      const speed = Math.abs(velocityRef.current.x);
      if (speed > 0.05) {
        if (!isRunningRef.current) {
          isRunningRef.current = true;
          hasCompletedFirstCycleRef.current = false;
          animationFrameRef.current = 0;
          animationTimerRef.current = 0;
          setCurrentTexture(runTextures[0]);
        } else {
          animationTimerRef.current += 1;
          if (animationTimerRef.current > 3) {
            animationTimerRef.current = 0;

            if (!hasCompletedFirstCycleRef.current) {
              animationFrameRef.current += 1;
              if (animationFrameRef.current >= runTextures.length) {
                hasCompletedFirstCycleRef.current = true;
                animationFrameRef.current = 5;
              }
            } else {
              animationFrameRef.current += 1;
              if (animationFrameRef.current >= runTextures.length) {
                animationFrameRef.current = 5;
              }
            }

            setCurrentTexture(runTextures[animationFrameRef.current]);
          }
        }
      } else {
        isRunningRef.current = false;
        animationFrameRef.current = 0;
        animationTimerRef.current = 0;
        setCurrentTexture(idleTexture);
      }

      // Update position (z=0.05 to render in front of collision layer at z=0)
      meshRef.current.position.set(newX, newY, collisionPosition[2] + 0.05);
      playerPositionRef.current.set(newX, newY, collisionPosition[2] + 0.05);

      // Flip sprite based on direction
      meshRef.current.scale.x = facingRightRef.current ? 1 : -1;
    };

    ticker.add(updatePhysics);
    return () => ticker.remove(updatePhysics);
  }, [collisionTiles, collisionPosition, tileSize, pixelSize, planeWidth, planeHeight, runTextures, idleTexture, gameCamera, gameViewportWidth]);

  return (
    <mesh ref={meshRef} position={[playerPositionRef.current.x, playerPositionRef.current.y, playerPositionRef.current.z]}>
      <planeGeometry args={[playerSize, playerSize]} />
      <meshBasicMaterial
        map={currentTexture}
        transparent
        alphaTest={0.1}
        side={THREE.FrontSide}
      />
    </mesh>
  );
}

// Camera follower component
function CameraFollower({ playerPositionRef, gameCamera }: { playerPositionRef: React.MutableRefObject<THREE.Vector3>; gameCamera: THREE.OrthographicCamera }) {

  useEffect(() => {
    // Lock camera rotation to look straight ahead
    gameCamera.rotation.set(0, 0, 0);
    gameCamera.updateProjectionMatrix();
  }, [gameCamera]);

  useEffect(() => {
    const updateCamera = () => {
      const targetX = playerPositionRef.current.x;
      const targetY = playerPositionRef.current.y;

      // Smooth camera follow with lerp (only position, not rotation)
      gameCamera.position.x = targetX;
      gameCamera.position.y = targetY + 5; // Keep offset from player

      // Ensure camera maintains forward-facing orientation
      gameCamera.rotation.set(0, 0, 0);
    };

    ticker.add(updateCamera);
    return () => ticker.remove(updateCamera);
  }, [gameCamera, playerPositionRef]);

  return null;
}

export function GameContent({ gameCamera, gameViewportWidth, gameInputRef, npcInRangeRef, autoWalkRef }: { gameCamera: THREE.OrthographicCamera; gameViewportWidth: number; gameInputRef?: React.RefObject<{ active: boolean; startX: number; currentX: number; maxDx: number; startTime: number }>; npcInRangeRef?: React.MutableRefObject<boolean>; autoWalkRef?: React.MutableRefObject<number | null> }) {
  // Texture loading once
  const spritesheetTexture = useLoader(THREE.TextureLoader, "/footer-env/spritesheet.png");
  useMemo(() => {
    spritesheetTexture.minFilter = THREE.NearestFilter;
    spritesheetTexture.magFilter = THREE.NearestFilter;
    spritesheetTexture.needsUpdate = true;
  }, [spritesheetTexture]);

  // Spritesheet is 128x1264 pixels with 16x16 tiles
  const tilesPerRow = 8;

  // Configure each layer with custom positions [x, y, z] and parallax factors
  const allLayers = useMemo(() => {
    const pixelSize = 0.1;
    const z1Height = Z1Data.mapHeight * Z1Data.tileSize * pixelSize;
    const z6Height = Z6Data.mapHeight * Z6Data.tileSize * pixelSize;

    // Align Z6 bottom with Z1 bottom (ground)
    const z6Y = (z6Height - z1Height) / 2;

    const layers: Array<{ data: TileMapData; zIndex: number; position: [number, number, number]; parallaxFactor: number }> = [
      { data: Z0Data, zIndex: 1, position: [0, -12.8, 0.1], parallaxFactor: 1.0 },
      { data: Z1Data, zIndex: 2, position: [0, 0, 0], parallaxFactor: 1.0 },
      { data: Z2Data, zIndex: 3, position: [-13, 26.5, -1], parallaxFactor: 0.95 },
      { data: Z3Data, zIndex: 4, position: [0, -6.2, -1.5], parallaxFactor: 0.85 },
      { data: Z4Data, zIndex: 5, position: [-75, -8, -2.0], parallaxFactor: 0.75 },
      { data: Z5Data, zIndex: 6, position: [-30, -4.5, -2.5], parallaxFactor: 0.45 },
      { data: Z6Data, zIndex: 7, position: [0, z6Y, -3.0], parallaxFactor: 0.25 },
    ];
    return layers;
  }, []);

  // Extract collision tiles from Z1 for physics
  const collisionTiles = useMemo(() => {
    const tiles: Tile[] = [];
    Z1Data.layers.forEach(layer => {
      if (layer.collider) {
        tiles.push(...layer.tiles);
      }
    });
    return tiles;
  }, []);

  const collisionPosition: [number, number, number] = [0, 0, 0];
  const tileSize = Z1Data.tileSize;
  const pixelSize = 0.1;

  // Shared player position ref for camera following
  const startX = collisionPosition[0] - 46;
  const startY = collisionPosition[1];
  const playerPositionRef = useRef(new THREE.Vector3(startX, startY, collisionPosition[2]));

  return (
    <group>
      <PhysicsPlayer
        collisionTiles={collisionTiles}
        collisionPosition={collisionPosition}
        tileSize={tileSize}
        pixelSize={pixelSize}
        mapWidth={Z1Data.mapWidth}
        mapHeight={Z1Data.mapHeight}
        playerPositionRef={playerPositionRef}
        gameCamera={gameCamera}
        gameViewportWidth={gameViewportWidth}
        gameInputRef={gameInputRef}
        autoWalkRef={autoWalkRef}
        npcInRangeRef={npcInRangeRef}
      />

      <CameraFollower playerPositionRef={playerPositionRef} gameCamera={gameCamera} />

      <NostalgiaDialogue position={[5, -2, -0.5]} playerPositionRef={playerPositionRef} gameCamera={gameCamera} npcInRangeRef={npcInRangeRef} autoWalkRef={autoWalkRef} gameInputRef={gameInputRef} />

      {allLayers.map(({ data, zIndex, position, parallaxFactor }) => (
        <LayerPlane
          key={`layer-${zIndex}`}
          layerData={data}
          zIndex={zIndex}
          position={position}
          parallaxFactor={parallaxFactor}
          playerPositionRef={playerPositionRef}
          spritesheetTexture={spritesheetTexture}
          tilesPerRow={tilesPerRow}
        />
      ))}
    </group>
  );
}
