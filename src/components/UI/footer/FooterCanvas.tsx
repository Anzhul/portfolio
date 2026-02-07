import { Canvas, useLoader, useThree, useFrame } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { useMemo, useEffect, useRef, useState } from 'react';
import { ticker } from '../../../utils/AnimationTicker';
import { Html } from '@react-three/drei';

// Import all Z layer JSON files
import Z0Data from '../../../data/Z0.json';
import Z1Data from '../../../data/Z1 (Collision).json';
import Z2Data from '../../../data/Z2.json';
import Z3Data from '../../../data/Z3.json';
import Z4Data from '../../../data/Z4.json';
import Z5Data from '../../../data/Z5.json';
import Z6Data from '../../../data/Z6.json';

interface Tile {
  id: string;
  x: number;
  y: number;
}

interface Layer {
  name: string;
  tiles: Tile[];
  collider?: boolean;
}

interface TileMapData {
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  layers: Layer[];
}

interface LayerPlaneProps {
  layerData: TileMapData;
  zIndex: number;
  spritesheetTexture: THREE.Texture;
  tilesPerRow: number;
  position: [number, number, number];
  parallaxFactor: number;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
}

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
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Physics Player with collision detection
interface PhysicsPlayerProps {
  collisionTiles: Tile[];
  collisionPosition: [number, number, number];
  tileSize: number;
  pixelSize: number;
  mapWidth: number;
  mapHeight: number;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
}

function PhysicsPlayer({ collisionTiles, collisionPosition, tileSize, pixelSize, mapWidth, mapHeight, playerPositionRef }: PhysicsPlayerProps) {
  const { camera, viewport } = useThree();
  const meshRef = useRef<THREE.Mesh>(null!);
  const velocityRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({ left: false, right: false, up: false });
  const boundsRef = useRef({ minX: -Infinity, maxX: Infinity });
  
  // Initialize mesh position from ref
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(playerPositionRef.current);
    }
  }, [playerPositionRef]);
  
  // Player constants
  const playerSize = 6.2; // Doubled again
  const moveSpeed = 0.4;
  const gravity = -0.02;
  const [isGrounded, setIsGrounded] = useState(false);
  
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

  // Animation state
  const [currentTexture, setCurrentTexture] = useState<THREE.Texture>(idleTexture);
  const animationFrameRef = useRef(0);
  const animationTimerRef = useRef(0);
  const facingRightRef = useRef(true);
  const hasCompletedFirstCycleRef = useRef(false);
  const isRunningRef = useRef(false);

  // Configure texture filtering for pixel art
  useEffect(() => {
    const allTextures = [idleTexture, ...runTextures];
    allTextures.forEach(texture => {
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
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

  // Check collision with tiles
  const checkCollision = (x: number, y: number, checkingHorizontal: boolean = false): { collided: boolean, blockingTile?: Tile } => {
    const playerLeft = x - playerSize / 2;
    const playerRight = x + playerSize / 2;
    
    // For horizontal checks, check mid-body only to avoid ground tiles
    // For vertical checks, use full player height
    const playerTop = checkingHorizontal ? (y + playerSize * 0.3) : (y + playerSize / 2);
    const playerBottom = checkingHorizontal ? (y - playerSize * 0.1) : (y - playerSize / 2);

    for (const tile of collisionTiles) {
      // Convert tile position to world coordinates
      // Plane is centered, so offset by half the plane dimensions
      const tileWorldX = collisionPosition[0] - planeWidth / 2 + (tile.x * tileSize * pixelSize);
      const tileWorldY = collisionPosition[1] + planeHeight / 2 - (tile.y * tileSize * pixelSize);

      const tileLeft = tileWorldX;
      const tileRight = tileWorldX + (tileSize * pixelSize);
      const tileTop = tileWorldY;
      const tileBottom = tileWorldY - (tileSize * pixelSize);

      // For horizontal checks, only skip tiles that are at/near the same X position as player (ground directly below)
      if (checkingHorizontal) {
        const playerCenterX = x;
        const tileCenterX = tileWorldX + (tileSize * pixelSize) / 2;
        const tileCenterY = tileWorldY - (tileSize * pixelSize) / 2;
        
        // Skip tile if it's at player's X position AND below player's feet
        const isBelowPlayer = tileCenterY < (y - playerSize * 0.4);
        const isAtPlayerX = Math.abs(tileCenterX - playerCenterX) < playerSize * 0.6;
        
        if (isBelowPlayer && isAtPlayerX) {
          continue; // Skip ground tiles directly below player
        }
      }

      // AABB collision detection
      if (
        playerRight > tileLeft &&
        playerLeft < tileRight &&
        playerTop > tileBottom &&
        playerBottom < tileTop
      ) {
        return { collided: true, blockingTile: tile };
      }
    }
    return { collided: false };
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

  // Physics update loop
  useEffect(() => {
    const updatePhysics = () => {
      if (!meshRef.current) return;

      const currentPos = meshRef.current.position;
      
      // Calculate camera boundaries
      const halfWidth = viewport.width / 2;
      const cameraLeftEdge = camera.position.x - halfWidth;
      const cameraRightEdge = camera.position.x + halfWidth;
      const { minX, maxX } = boundsRef.current;

      // Horizontal movement
      if (keysRef.current.left) {
        // Check if camera is too close to left edge
        if (cameraLeftEdge > minX + 5) {
          velocityRef.current.x = -moveSpeed;
          facingRightRef.current = false;
        } else {
          velocityRef.current.x = 0;
        }
      } else if (keysRef.current.right) {
        // Check if camera is too close to right edge
        if (cameraRightEdge < maxX - 5) {
          velocityRef.current.x = moveSpeed;
          facingRightRef.current = true;
        } else {
          velocityRef.current.x = 0;
        }
      } else {
        velocityRef.current.x *= 0.8; // Friction
      }

      // Jump disabled
      // if (keysRef.current.up && isGrounded) {
      //   velocityRef.current.y = jumpForce;
      //   setIsGrounded(false);
      // }

      // Apply gravity
      velocityRef.current.y += gravity;

      // Clamp falling speed
      if (velocityRef.current.y < -1) {
        velocityRef.current.y = -1;
      }

      // Calculate new position
      let newX = currentPos.x + velocityRef.current.x;
      let newY = currentPos.y + velocityRef.current.y;

      // Horizontal collision disabled - player can move freely left/right
      // Only vertical collision (with ground) is active

      // Check vertical collision (with all tiles)
      const verticalCollision = checkCollision(currentPos.x, newY, false);
      if (verticalCollision.collided) {
        // Check if landing (moving downward)
        if (velocityRef.current.y < 0) {
          setIsGrounded(true);
        }
        newY = currentPos.y; // Stop vertical movement
        velocityRef.current.y = 0;
      } else {
        setIsGrounded(false);
      }

      // Update sprite animation
      const speed = Math.abs(velocityRef.current.x);
      if (speed > 0.05) {
        // Running - animate through run cycle
        if (!isRunningRef.current) {
          // Just started running - reset to beginning
          isRunningRef.current = true;
          hasCompletedFirstCycleRef.current = false;
          animationFrameRef.current = 0;
          animationTimerRef.current = 0;
          setCurrentTexture(runTextures[0]);
        } else {
          animationTimerRef.current += 1;
          if (animationTimerRef.current > 3) { // Change frame every 3 ticks
            animationTimerRef.current = 0;
            
            if (!hasCompletedFirstCycleRef.current) {
              // First cycle: go through all frames 0-12
              animationFrameRef.current += 1;
              if (animationFrameRef.current >= runTextures.length) {
                // Completed first cycle
                hasCompletedFirstCycleRef.current = true;
                animationFrameRef.current = 5; // Start loop from frame 5
              }
            } else {
              // Subsequent cycles: loop frames 5-12
              animationFrameRef.current += 1;
              if (animationFrameRef.current >= runTextures.length) {
                animationFrameRef.current = 5; // Loop back to frame 5
              }
            }
            
            setCurrentTexture(runTextures[animationFrameRef.current]);
          }
        }
      } else {
        // Idle - show idle sprite
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
  }, [collisionTiles, collisionPosition, tileSize, pixelSize, isGrounded, planeWidth, planeHeight, runTextures, idleTexture, camera, viewport]);

  return (
    <mesh ref={meshRef} position={[playerPositionRef.current.x, playerPositionRef.current.y, playerPositionRef.current.z]}>
      <planeGeometry args={[playerSize, playerSize]} />
      <meshBasicMaterial 
        map={currentTexture} 
        transparent 
        alphaTest={0.1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function FloatingSprite({ position }: { position: [number, number, number] }) {
  const texture = useLoader(TextureLoader, '/footer-env/Nostalgia.png');
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useEffect(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
  }, [texture]);

  useEffect(() => {
    const updateHover = () => {
      if (meshRef.current) {
        const time = Date.now() * 0.001;
        // Slow up and down movement
        meshRef.current.position.y = position[1] + Math.sin(time * 1.5) * 0.5;
      }
    };
    
    ticker.add(updateHover);
    return () => ticker.remove(updateHover);
  }, [position]);

  // 128px * 0.1 scale factor = 12.8 units
  const size = 12.8;

  return (
    <mesh ref={meshRef} position={position} scale={[-1, 1, 1]}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
}

function TextBox({ visible, text }: { visible: boolean, text: string }) {
  if (!visible) return null;

  return (
    <Html fullscreen className="footer-textbox-container" zIndexRange={[100, 0]}>
      <div className="footer-textbox">
        {text}
      </div>
    </Html>
  );
}

function InteractionZone({ targetPosition, playerPositionRef, text, children }: { targetPosition: [number, number, number], playerPositionRef: React.MutableRefObject<THREE.Vector3>, text: string, children?: React.ReactNode }) {
  const [inRange, setInRange] = useState(false);
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    const checkDistance = () => {
      if (!playerPositionRef.current) return;
      
      const dx = playerPositionRef.current.x - targetPosition[0];
      const dy = playerPositionRef.current.y - targetPosition[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Check if within 8 units
      const isClose = dist < 8;
      
      if (isClose !== inRange) {
        setInRange(isClose);
        if (!isClose) {
          setShowText(false);
        }
      }
    };

    ticker.add(checkDistance);
    return () => ticker.remove(checkDistance);
  }, [targetPosition, inRange, playerPositionRef]);

  useEffect(() => {
    if (!inRange) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        setShowText(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inRange]);

  return (
    <>
      <group onClick={(e) => {
        if (inRange) {
          e.stopPropagation();
          setShowText(prev => !prev);
        }
      }}>
        {children}
      </group>
      <TextBox visible={showText} text={text} />
    </>
  );
}

// Camera follower component
function CameraFollower({ playerPositionRef }: { playerPositionRef: React.MutableRefObject<THREE.Vector3> }) {
  const { camera, viewport } = useThree();

  useEffect(() => {
    // Lock camera rotation to look straight ahead
    camera.rotation.set(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera]);

  useEffect(() => {
    const updateCamera = () => {
      const targetX = playerPositionRef.current.x;
      const targetY = playerPositionRef.current.y;
      
      // Smooth camera follow with lerp (only position, not rotation)
      camera.position.x = targetX;
      camera.position.y = targetY + 5; // Keep offset from player
      
      // Ensure camera maintains forward-facing orientation
      camera.rotation.set(0, 0, 0);
    };

    ticker.add(updateCamera);
    return () => ticker.remove(updateCamera);
  }, [camera, playerPositionRef, viewport]);

  return null;
}

function Scene() {
  const { gl, scene, camera } = useThree();

  // Texture loading once
  const spritesheetTexture = useLoader(THREE.TextureLoader, "/footer-env/spritesheet.png");
  spritesheetTexture.minFilter = THREE.NearestFilter;
  spritesheetTexture.magFilter = THREE.NearestFilter;
  
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
      { data: Z0Data, zIndex: 1, position: [0, -12.8, 0.1], parallaxFactor: 1.0 },    // Foreground - moves fastest
      { data: Z1Data, zIndex: 2, position: [0, 0, 0], parallaxFactor: 1.0 },          // Base layer - no parallax
      { data: Z2Data, zIndex: 3, position: [-13, 26.5, -1], parallaxFactor: 0.95 },
      { data: Z3Data, zIndex: 4, position: [0, -6.2, -1.5], parallaxFactor: 0.85 },
      { data: Z4Data, zIndex: 5, position: [-75, -8, -2.0], parallaxFactor: 0.75 },
      { data: Z5Data, zIndex: 6, position: [-30, -4.5, -2.5], parallaxFactor: 0.45 }, // Far background - moves slowest
      { data: Z6Data, zIndex: 7, position: [0, z6Y, -3.0], parallaxFactor: 0.25 },       // Very front overlay
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

  const collisionPosition: [number, number, number] = [0, 0, 0]; // Z1 position
  const tileSize = Z1Data.tileSize;
  const pixelSize = 0.1;

  // Shared player position ref for camera following
  // Start player in the middle of the tile coordinate system (around tile x=126)
  const startX = collisionPosition[0]; // Center of plane aligns with center of tile map
  const startY = collisionPosition[1] + 10;
  const playerPositionRef = useRef(new THREE.Vector3(startX, startY, collisionPosition[2] + 0.05));

  // Render loop using AnimationTicker
  useEffect(() => {
    const onTick = () => {
      gl.render(scene, camera);
    };
    ticker.add(onTick);
    return () => ticker.remove(onTick);
  }, [gl, scene, camera]);

  return (
    <group>
      {/* Physics player with collision - Update this first so ref is fresh for others */}
      <PhysicsPlayer
        collisionTiles={collisionTiles}
        collisionPosition={collisionPosition}
        tileSize={tileSize}
        pixelSize={pixelSize}
        mapWidth={Z1Data.mapWidth}
        mapHeight={Z1Data.mapHeight}
        playerPositionRef={playerPositionRef}
      />

      {/* Camera follows player */}
      <CameraFollower playerPositionRef={playerPositionRef} />
      
      {/* Floating Nostalgia Sprite with Interaction */}
      <InteractionZone targetPosition={[5, -2, -0.5]} playerPositionRef={playerPositionRef} text="Hello Traveler!">
        <FloatingSprite position={[5, -2.5, -0.5]} />
      </InteractionZone>

      {/* All Z layer planes */}
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

export const FooterCanvas: React.FC = () => {
  return (
    <Canvas
      orthographic
      camera={{ 
        position: [0, 5, 25],
        zoom: 8,
        near: 0.1,
        far: 1000
      }}
      gl={{ alpha: false, antialias: false }}
      style={{ width: '100%', height: '100%', backgroundColor: '#000000' }}
      frameloop="never"
    >
      <color attach="background" args={['#000000']} />
      <Scene />
    </Canvas>
  );
};
