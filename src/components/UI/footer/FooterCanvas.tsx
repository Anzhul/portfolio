import { Canvas, useLoader, useThree, createPortal } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { ticker } from '../../../utils/AnimationTicker';
import { Html } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyMaterialOverrides, type MaterialOverride } from '../../canvas/home/materialUtils';

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
interface PhysicsPlayerProps {
  collisionTiles: Tile[];
  collisionPosition: [number, number, number];
  tileSize: number;
  pixelSize: number;
  mapWidth: number;
  mapHeight: number;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
  gameCamera: THREE.OrthographicCamera;
  gameViewportWidth: number;
}

function PhysicsPlayer({ collisionTiles, collisionPosition, tileSize, pixelSize, mapWidth, mapHeight, playerPositionRef, gameCamera, gameViewportWidth }: PhysicsPlayerProps) {
  const { gl } = useThree();
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

  // Animation state — currentTexture uses React state so R3F manages the material map prop,
  // which ensures correct color space and uniform handling. This is safe now because
  // isGrounded is a ref (no physics effect churn on re-render), and React bails out
  // when setState receives the same reference (~20 re-renders/sec only during animation).
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
      texture.needsUpdate = true; // Re-upload to GPU with new filter settings
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

    // For horizontal checks, check mid-body only to avoid ground tiles
    // For vertical checks, use full player height
    const playerTop = checkingHorizontal ? (y + playerSize * 0.3) : (y + playerSize / 2);
    const playerBottom = checkingHorizontal ? (y - playerSize * 0.1) : (y - playerSize / 2);

    const tileSizeWorld = tileSize * pixelSize;
    const offsetX = collisionPosition[0] - planeWidth / 2;
    const offsetY = collisionPosition[1] + planeHeight / 2;

    // Convert player bounds to tile coordinates
    const tileXMin = Math.floor((playerLeft - offsetX) / tileSizeWorld);
    const tileXMax = Math.floor((playerRight - offsetX) / tileSizeWorld);
    const tileYMin = Math.floor((offsetY - playerTop) / tileSizeWorld);
    const tileYMax = Math.floor((offsetY - playerBottom) / tileSizeWorld);

    for (let tx = tileXMin; tx <= tileXMax; tx++) {
      for (let ty = tileYMin; ty <= tileYMax; ty++) {
        if (!collisionGrid.has(`${tx},${ty}`)) continue;

        // Tile exists — do precise AABB check
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

  // Touch/Drag controls
  useEffect(() => {
    let startX = 0;
    let isDragging = false;
    const threshold = 20; // pixels to drag before moving

    const handlePointerDown = (e: PointerEvent) => {
      startX = e.clientX;
      isDragging = true;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      
      const currentX = e.clientX;
      const diff = currentX - startX;

      if (diff > threshold) {
        keysRef.current.right = true;
        keysRef.current.left = false;
      } else if (diff < -threshold) {
        keysRef.current.left = true;
        keysRef.current.right = false;
      } else {
        keysRef.current.left = false;
        keysRef.current.right = false;
      }
    };

    const handlePointerUp = () => {
      isDragging = false;
      keysRef.current.left = false;
      keysRef.current.right = false;
    };

    const canvas = gl.domElement;
    canvas.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, [gl.domElement]);

  // Physics update loop
  useEffect(() => {
    const updatePhysics = () => {
      if (!meshRef.current) return;

      const currentPos = meshRef.current.position;
      
      // Calculate camera boundaries
      const halfWidth = gameViewportWidth / 2;
      const cameraLeftEdge = gameCamera.position.x - halfWidth;
      const cameraRightEdge = gameCamera.position.x + halfWidth;
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
      if (checkCollision(currentPos.x, newY, false)) {
        // Check if landing (moving downward)
        if (velocityRef.current.y < 0) {
          isGroundedRef.current = true;
        }
        newY = currentPos.y; // Stop vertical movement
        velocityRef.current.y = 0;
      } else {
        isGroundedRef.current = false;
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

function FloatingSprite({ position }: { position: [number, number, number] }) {
  const texture = useLoader(TextureLoader, '/footer-env/Nostalgia.png');
  const meshRef = useRef<THREE.Mesh>(null!);
  
  useEffect(() => {
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
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
      <meshBasicMaterial map={texture} transparent side={THREE.FrontSide} />
    </mesh>
  );
}

interface TextBoxChoice {
  label: string;
  onSelect: () => void;
}

function TextBox({ visible, text, type = 'interact', faceSprite, choices, onClose }: { visible: boolean, text: string, type?: 'interact' | 'dialogue', faceSprite?: string, choices?: TextBoxChoice[], onClose: () => void }) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (visible) {
      setSelectedChoice(0);
      setShowChoices(false);
      if (type === 'dialogue') {
        setDisplayedText('');
        setIsTyping(true);
        let index = 0;

        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
          if (index < text.length) {
            index++;
            setDisplayedText(text.slice(0, index));
          } else {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsTyping(false);
            if (choices && choices.length > 0) {
              setShowChoices(true);
            }
          }
        }, 30);
      } else {
        setDisplayedText(text);
        setIsTyping(false);
      }
    } else {
      setDisplayedText('');
      setIsTyping(false);
      setShowChoices(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [visible, text]);

  const handleInteract = useCallback(() => {
    if (isTyping) {
      if (timerRef.current) clearInterval(timerRef.current);
      setDisplayedText(text);
      setIsTyping(false);
      if (choices && choices.length > 0) {
        setShowChoices(true);
      }
    } else if (!showChoices) {
      onClose();
    }
  }, [isTyping, text, onClose, choices, showChoices]);

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showChoices && choices) {
        if (e.key === 'ArrowUp' || e.key === 'w') {
          e.stopImmediatePropagation();
          e.preventDefault();
          setSelectedChoice(prev => (prev - 1 + choices.length) % choices.length);
        } else if (e.key === 'ArrowDown' || e.key === 's') {
          e.stopImmediatePropagation();
          e.preventDefault();
          setSelectedChoice(prev => (prev + 1) % choices.length);
        } else if (e.key === 'Enter') {
          e.stopImmediatePropagation();
          choices[selectedChoice].onSelect();
        }
      } else if (e.key === 'Enter') {
        handleInteract();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [visible, handleInteract, showChoices, choices, selectedChoice]);

  if (!visible) return null;

  return (
    <Html fullscreen className="footer-textbox-container" zIndexRange={[100, 0]}>
      <div className="footer-textbox-wrapper" onClick={showChoices ? undefined : handleInteract}>
        <div className={`footer-textbox ${type}`}>
          {faceSprite && <img src={faceSprite} alt="Speaker" className="textbox-face" />}
          <div className="textbox-content">
            {displayedText}
            {showChoices && choices && (
              <div className="textbox-choices">
                {choices.map((choice, i) => (
                  <div
                    key={i}
                    className={`textbox-choice ${i === selectedChoice ? 'selected' : ''}`}
                    onClick={(e) => { e.stopPropagation(); choice.onSelect(); }}
                  >
                    {i === selectedChoice ? '\u2764 ' : '  '}{choice.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Html>
  );
}

type DialogueState = 'idle' | 'greeting' | 'question' | 'decline' | 'battle' | 'victory' | 'defeat';

function BattleGame({ onWin, onLose }: { onWin: () => void; onLose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onWinRef = useRef(onWin);
  const onLoseRef = useRef(onLose);
  onWinRef.current = onWin;
  onLoseRef.current = onLose;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let destroyed = false;
    const W = 580, H = 300;
    canvas.width = W;
    canvas.height = H;

    // Battle box
    const boxX = 140, boxY = 60, boxW = 300, boxH = 200;

    // Heart
    const heart = { x: boxX + boxW / 2, y: boxY + boxH / 2, size: 8, speed: 2.5 };

    // Game state
    let hp = 20;
    const maxHp = 20;
    let invincible = 0;
    let wave = 0;
    let waveTimer = 0;
    let spawnTimer = 0;
    let gamePhase: 'ready' | 'fighting' | 'transition' | 'won' | 'lost' = 'ready';
    let phaseTimer = 0;
    const totalWaves = 3;

    type BulletStyle = 'bone' | 'circle' | 'star' | 'diamond';
    type Bullet = {
      x: number; y: number;
      vx: number; vy: number;
      w: number; h: number;         // visual size
      hitW: number; hitH: number;   // hitbox size (can be tighter than visual)
      style: BulletStyle;
      rotation: number;
      rotSpeed: number;
      color: string;
      damage: number;
    };
    let bullets: Bullet[] = [];
    const keys = { up: false, down: false, left: false, right: false };

    function drawBullet(b: Bullet) {
      ctx!.save();
      ctx!.translate(b.x, b.y);
      ctx!.rotate(b.rotation);
      ctx!.fillStyle = b.color;

      if (b.style === 'bone') {
        // Tall bone: shaft + knobs on each end
        const shaftW = b.w * 0.5;
        const knobR = b.w * 0.6;
        // Shaft
        ctx!.fillRect(-shaftW / 2, -b.h / 2, shaftW, b.h);
        // Top knob
        ctx!.beginPath();
        ctx!.arc(0, -b.h / 2, knobR, 0, Math.PI * 2);
        ctx!.fill();
        // Bottom knob
        ctx!.beginPath();
        ctx!.arc(0, b.h / 2, knobR, 0, Math.PI * 2);
        ctx!.fill();
      } else if (b.style === 'circle') {
        // Simple filled circle
        ctx!.beginPath();
        ctx!.arc(0, 0, b.w / 2, 0, Math.PI * 2);
        ctx!.fill();
      } else if (b.style === 'star') {
        // 4-pointed star
        const outer = b.w / 2;
        const inner = b.w / 5;
        ctx!.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? outer : inner;
          const angle = (i * Math.PI) / 4;
          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;
          if (i === 0) ctx!.moveTo(px, py);
          else ctx!.lineTo(px, py);
        }
        ctx!.closePath();
        ctx!.fill();
      } else if (b.style === 'diamond') {
        // Diamond / rhombus shape
        const hw = b.w / 2;
        const hh = b.h / 2;
        ctx!.beginPath();
        ctx!.moveTo(0, -hh);
        ctx!.lineTo(hw, 0);
        ctx!.lineTo(0, hh);
        ctx!.lineTo(-hw, 0);
        ctx!.closePath();
        ctx!.fill();
      }

      ctx!.restore();
    }

    const keyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
      e.preventDefault();
      e.stopImmediatePropagation();
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
      if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
      if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
    };

    window.addEventListener('keydown', keyDown, true);
    window.addEventListener('keyup', keyUp, true);

    function spawnWaveBullets() {
      if (wave === 0) {
        // Bones from right side — tall visual, thin hitbox
        const y = boxY + 20 + Math.random() * (boxH - 40);
        const boneH = 30 + Math.random() * 20;
        bullets.push({
          x: boxX + boxW + 10, y, vx: -2 - Math.random(), vy: 0,
          w: 8, h: boneH,
          hitW: 4, hitH: boneH * 0.75,
          style: 'bone', rotation: 0, rotSpeed: 0,
          color: '#ffffff', damage: 2,
        });
      } else if (wave === 1) {
        // Bones from both sides + occasional circles
        const y = boxY + 20 + Math.random() * (boxH - 40);
        if (Math.random() > 0.3) {
          // Bone
          const boneH = 25 + Math.random() * 20;
          const fromRight = Math.random() > 0.5;
          bullets.push({
            x: fromRight ? boxX + boxW + 10 : boxX - 10,
            y, vx: fromRight ? -2.5 - Math.random() : 2.5 + Math.random(), vy: 0,
            w: 8, h: boneH,
            hitW: 4, hitH: boneH * 0.75,
            style: 'bone', rotation: 0, rotSpeed: 0,
            color: '#ffffff', damage: 2,
          });
        } else {
          // Small fast circle
          const fromRight = Math.random() > 0.5;
          bullets.push({
            x: fromRight ? boxX + boxW + 10 : boxX - 10,
            y, vx: fromRight ? -3.5 : 3.5, vy: (Math.random() - 0.5) * 1.5,
            w: 10, h: 10,
            hitW: 6, hitH: 6,
            style: 'circle', rotation: 0, rotSpeed: 0,
            color: '#00ccff', damage: 3,
          });
        }
      } else if (wave === 2) {
        // Stars + diamonds bursting from center
        const cx = boxX + boxW / 2;
        const cy = boxY + boxH / 2;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.2 + Math.random() * 0.8;
        if (Math.random() > 0.4) {
          // Spinning star
          bullets.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            w: 12, h: 12,
            hitW: 6, hitH: 6,
            style: 'star', rotation: 0, rotSpeed: 0.12,
            color: '#ffff00', damage: 2,
          });
        } else {
          // Fast diamond
          bullets.push({
            x: cx, y: cy,
            vx: Math.cos(angle) * (speed + 0.5), vy: Math.sin(angle) * (speed + 0.5),
            w: 10, h: 14,
            hitW: 6, hitH: 8,
            style: 'diamond', rotation: 0, rotSpeed: 0.08,
            color: '#ff66ff', damage: 3,
          });
        }
      }
    }

    function drawHeart(x: number, y: number, size: number, flash: boolean) {
      if (flash && Math.floor(invincible / 3) % 2 === 0) return;
      ctx!.fillStyle = '#ff0000';
      ctx!.beginPath();
      const s = size;
      ctx!.moveTo(x, y - s * 0.4);
      ctx!.bezierCurveTo(x - s, y - s * 1.2, x - s * 1.4, y + s * 0.2, x, y + s);
      ctx!.bezierCurveTo(x + s * 1.4, y + s * 0.2, x + s, y - s * 1.2, x, y - s * 0.4);
      ctx!.fill();
    }

    function drawHpBar() {
      ctx!.fillStyle = '#ffffff';
      ctx!.font = 'bold 16px monospace';
      ctx!.textAlign = 'left';
      ctx!.fillText('HP', 20, 35);

      // Background (red = damage taken)
      ctx!.fillStyle = '#ff0000';
      ctx!.fillRect(50, 22, 200, 18);
      // Fill (yellow = remaining HP)
      ctx!.fillStyle = '#ffff00';
      ctx!.fillRect(50, 22, 200 * (hp / maxHp), 18);

      ctx!.fillStyle = '#ffffff';
      ctx!.textAlign = 'right';
      ctx!.fillText(`${hp} / ${maxHp}`, 300, 35);
    }

    const targetInterval = 1000 / 60; // Cap at 60fps
    let lastFrameTime = 0;

    function update(timestamp: number) {
      if (destroyed) return;

      // Throttle to 60fps — skip frames on high-refresh-rate displays
      const elapsed = timestamp - lastFrameTime;
      if (elapsed < targetInterval) {
        requestAnimationFrame(update);
        return;
      }
      lastFrameTime = timestamp - (elapsed % targetInterval);

      // Clear
      ctx!.fillStyle = '#000000';
      ctx!.fillRect(0, 0, W, H);

      drawHpBar();

      // Battle box border
      ctx!.strokeStyle = '#ffffff';
      ctx!.lineWidth = 3;
      ctx!.strokeRect(boxX, boxY, boxW, boxH);

      if (gamePhase === 'ready') {
        phaseTimer++;
        ctx!.fillStyle = '#ffffff';
        ctx!.font = 'bold 20px monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText(`Wave ${wave + 1}`, W / 2, boxY + boxH / 2 - 10);
        ctx!.font = '14px monospace';
        ctx!.fillText('Dodge the attacks!', W / 2, boxY + boxH / 2 + 15);
        drawHeart(heart.x, heart.y, heart.size, false);
        if (phaseTimer > 90) {
          gamePhase = 'fighting';
          phaseTimer = 0;
          waveTimer = 0;
          spawnTimer = 0;
          bullets = [];
        }
      } else if (gamePhase === 'fighting') {
        waveTimer++;
        spawnTimer++;

        // Spawn bullets at intervals
        const spawnRate = wave === 2 ? 12 : 8;
        if (spawnTimer >= spawnRate) {
          spawnTimer = 0;
          spawnWaveBullets();
        }

        // Move heart
        if (keys.up) heart.y -= heart.speed;
        if (keys.down) heart.y += heart.speed;
        if (keys.left) heart.x -= heart.speed;
        if (keys.right) heart.x += heart.speed;

        // Clamp heart to box
        heart.x = Math.max(boxX + heart.size, Math.min(boxX + boxW - heart.size, heart.x));
        heart.y = Math.max(boxY + heart.size, Math.min(boxY + boxH - heart.size, heart.y));

        // Update bullets
        bullets = bullets.filter(b => {
          b.x += b.vx;
          b.y += b.vy;
          b.rotation += b.rotSpeed;
          return b.x > boxX - 60 && b.x < boxX + boxW + 60 && b.y > boxY - 60 && b.y < boxY + boxH + 60;
        });

        // Draw bullets (clipped to box)
        ctx!.save();
        ctx!.beginPath();
        ctx!.rect(boxX + 2, boxY + 2, boxW - 4, boxH - 4);
        ctx!.clip();
        bullets.forEach(b => drawBullet(b));
        ctx!.restore();

        // Collision detection (uses hitbox, not visual size)
        if (invincible <= 0) {
          for (const b of bullets) {
            const dx = Math.abs(heart.x - b.x);
            const dy = Math.abs(heart.y - b.y);
            if (dx < (heart.size + b.hitW / 2) && dy < (heart.size + b.hitH / 2)) {
              hp -= b.damage;
              invincible = 30;
              if (hp <= 0) {
                hp = 0;
                gamePhase = 'lost';
                phaseTimer = 0;
              }
              break;
            }
          }
        }
        if (invincible > 0) invincible--;
        drawHeart(heart.x, heart.y, heart.size, invincible > 0);

        // Wave lasts ~6 seconds (360 frames at 60fps)
        if (waveTimer > 360) {
          wave++;
          if (wave >= totalWaves) {
            gamePhase = 'won';
            phaseTimer = 0;
          } else {
            gamePhase = 'transition';
            phaseTimer = 0;
            bullets = [];
          }
        }
      } else if (gamePhase === 'transition') {
        phaseTimer++;
        drawHeart(heart.x, heart.y, heart.size, false);
        ctx!.fillStyle = '#ffffff';
        ctx!.font = '16px monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText('...', W / 2, boxY + boxH / 2);
        if (phaseTimer > 60) {
          gamePhase = 'ready';
          phaseTimer = 0;
        }
      } else if (gamePhase === 'won') {
        phaseTimer++;
        drawHeart(heart.x, heart.y, heart.size, false);
        ctx!.fillStyle = '#ffff00';
        ctx!.font = 'bold 20px monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText('YOU WON!', W / 2, boxY + boxH / 2);
        if (phaseTimer > 120) {
          destroyed = true;
          onWinRef.current();
          return;
        }
      } else if (gamePhase === 'lost') {
        phaseTimer++;
        ctx!.fillStyle = '#ff0000';
        ctx!.font = 'bold 20px monospace';
        ctx!.textAlign = 'center';
        ctx!.fillText('YOU FELL...', W / 2, boxY + boxH / 2);
        if (phaseTimer > 120) {
          destroyed = true;
          onLoseRef.current();
          return;
        }
      }

      requestAnimationFrame(update);
    }

    requestAnimationFrame(update);

    return () => {
      destroyed = true;
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('keyup', keyUp, true);
    };
  }, []);

  return (
    <div className="battle-overlay">
      <canvas ref={canvasRef} className="battle-canvas" />
    </div>
  );
}

function NostalgiaDialogue({ position, playerPositionRef, onStartBattle }: { position: [number, number, number], playerPositionRef: React.MutableRefObject<THREE.Vector3>, onStartBattle: (onResult: (result: 'victory' | 'defeat') => void) => void }) {
  const [inRange, setInRange] = useState(false);
  const [dialogueState, setDialogueState] = useState<DialogueState>('idle');

  // Distance check
  useEffect(() => {
    const checkDistance = () => {
      if (!playerPositionRef.current) return;
      const dx = playerPositionRef.current.x - position[0];
      const dy = playerPositionRef.current.y - position[1];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const isClose = dist < 8;

      if (isClose !== inRange) {
        setInRange(isClose);
        // Only reset to idle if leaving range and not in battle/result states
        if (!isClose && dialogueState !== 'battle' && dialogueState !== 'victory' && dialogueState !== 'defeat') {
          setDialogueState('idle');
        }
      }
    };
    ticker.add(checkDistance);
    return () => ticker.remove(checkDistance);
  }, [position, inRange, playerPositionRef, dialogueState]);

  // Enter to start dialogue when in range and idle
  useEffect(() => {
    if (!inRange || dialogueState !== 'idle') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        setDialogueState('greeting');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inRange, dialogueState]);

  return (
    <>
      <group onClick={(e) => {
        if (inRange && dialogueState === 'idle') {
          e.stopPropagation();
          setDialogueState('greeting');
        }
      }}>
        <FloatingSprite position={[position[0], position[1] - 0.5, position[2]]} />
      </group>

      {/* Step 1: Greeting */}
      <TextBox
        visible={dialogueState === 'greeting'}
        text="Hello Traveler!"
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        onClose={() => setDialogueState('question')}
      />

      {/* Step 2: Battle question with choices */}
      <TextBox
        visible={dialogueState === 'question'}
        text="Would you like to do battle?"
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        choices={[
          { label: 'Yes', onSelect: () => {
            setDialogueState('battle');
            onStartBattle((result) => setDialogueState(result));
          } },
          { label: 'No', onSelect: () => setDialogueState('decline') },
        ]}
        onClose={() => {}}
      />

      {/* Decline */}
      <TextBox
        visible={dialogueState === 'decline'}
        text="Perhaps another time..."
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        onClose={() => setDialogueState('idle')}
      />

      {/* Victory */}
      <TextBox
        visible={dialogueState === 'victory'}
        text="Impressive... You have bested me."
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        onClose={() => setDialogueState('idle')}
      />

      {/* Defeat */}
      <TextBox
        visible={dialogueState === 'defeat'}
        text="You fell... but don't give up."
        type="dialogue"
        faceSprite="/footer-env/Nostalgia.png"
        onClose={() => setDialogueState('idle')}
      />

    </>
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

function GameContent({ onStartBattle, gameCamera, gameViewportWidth }: { onStartBattle: (onResult: (result: 'victory' | 'defeat') => void) => void; gameCamera: THREE.OrthographicCamera; gameViewportWidth: number }) {
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
        gameCamera={gameCamera}
        gameViewportWidth={gameViewportWidth}
      />

      {/* Camera follows player */}
      <CameraFollower playerPositionRef={playerPositionRef} gameCamera={gameCamera} />
      
      {/* Floating Nostalgia Sprite with Dialogue Sequence */}
      <NostalgiaDialogue position={[5, -2, -0.5]} playerPositionRef={playerPositionRef} onStartBattle={onStartBattle} />

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

// CRT screen shader
const crtVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const crtFragmentShader = `
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
function TVModel({ screenTexture, position = [0, 0, 0] as [number, number, number], scale = 1, materialOverrides = [] }: { screenTexture: THREE.Texture; position?: [number, number, number]; scale?: number; materialOverrides?: MaterialOverride[] }) {
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
            color: 0xffffff,
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

// TV Scene - orchestrates FBO rendering and TV display
function TVScene({ onStartBattle }: { onStartBattle: (onResult: (result: 'victory' | 'defeat') => void) => void }) {
  const { gl, scene, camera } = useThree();

  // Disable tone mapping for pixel art
  gl.toneMapping = THREE.NoToneMapping;
  gl.autoClear = false;

  const FBO_WIDTH = 768;
  const FBO_HEIGHT = 1024;

  const gameScene = useMemo(() => {
    const s = new THREE.Scene();
    s.background = new THREE.Color(0x000000);
    return s;
  }, []);

  const gameCamera = useMemo(() => {
    const cam = new THREE.OrthographicCamera(
      FBO_WIDTH / -2, FBO_WIDTH / 2,
      FBO_HEIGHT / 2, FBO_HEIGHT / -2,
      0.1, 1000
    );
    cam.zoom = 20;
    cam.position.set(0, 5, 25);
    cam.updateProjectionMatrix();
    return cam;
  }, []);

  const gameViewportWidth = FBO_HEIGHT / 8;

  const fbo = useMemo(() => {
    return new THREE.WebGLRenderTarget(FBO_WIDTH, FBO_HEIGHT, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
  }, []);

  useEffect(() => () => fbo.dispose(), [fbo]);

  // Point camera at the TV
  useEffect(() => {
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Two-pass rendering
  useEffect(() => {
    const render = () => {
      // Pass 1: Render game scene to FBO
      gl.setRenderTarget(fbo);
      gl.setClearColor(0x000000, 1);
      gl.clear();
      gl.render(gameScene, gameCamera);

      // Pass 2: Render TV scene to screen
      gl.setRenderTarget(null);
      gl.setClearColor(0x000000, 0);
      gl.clear();
      gl.render(scene, camera);
    };
    ticker.add(render);
    return () => ticker.remove(render);
  }, [gl, scene, camera, gameScene, gameCamera, fbo]);

  return (
    <>
      {createPortal(
        <GameContent
          onStartBattle={onStartBattle}
          gameCamera={gameCamera}
          gameViewportWidth={gameViewportWidth}
        />,
        gameScene
      )}
      <TVModel
        screenTexture={fbo.texture}
        position={[0, -1.8, 0]}
        scale={0.06}
        materialOverrides={[
          {
            materialName: 'Default',
            color: '#2a2a2a',
            roughness: 0.6,
            metalness: 0.1,
          },
          {
            materialName: 'Red',
            color: '#cc3333',
            roughness: 0.4,
            metalness: 0.1,
          },
          {
            materialName: 'White',
            color: '#e8e8e8',
            roughness: 0.5,
            metalness: 0.0,
          },
          {
            materialName: 'Yellow',
            color: '#FDBC65',
            roughness: 0.3,
            metalness: 0.2,
          },
          {
            materialName: 'gold',
            color: '#D4A843',
            metalness: 0.7,
            roughness: 0.2,
          },
        ]}
      />
      <ambientLight intensity={1} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
    </>
  );
}

export const FooterCanvas: React.FC = () => {
  const [showBattle, setShowBattle] = useState(false);
  const battleResultRef = useRef<((result: 'victory' | 'defeat') => void) | null>(null);

  const startBattle = useCallback((onResult: (result: 'victory' | 'defeat') => void) => {
    battleResultRef.current = onResult;
    setShowBattle(true);
  }, []);

  const handleBattleEnd = useCallback((result: 'victory' | 'defeat') => {
    setShowBattle(false);
    if (battleResultRef.current) {
      battleResultRef.current(result);
      battleResultRef.current = null;
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas
        camera={{
          position: [0, 0, 10],
          fov: 20,
          near: 0.1,
          far: 1000
        }}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%', touchAction: 'pan-y' }}
        frameloop="never"
      >
        <TVScene onStartBattle={startBattle} />
      </Canvas>
      {showBattle && (
        <BattleGame
          onWin={() => handleBattleEnd('victory')}
          onLose={() => handleBattleEnd('defeat')}
        />
      )}
    </div>
  );
};
