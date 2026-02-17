import * as THREE from 'three';

export interface Tile {
  id: string;
  x: number;
  y: number;
}

export interface Layer {
  name: string;
  tiles: Tile[];
  collider?: boolean;
}

export interface TileMapData {
  tileSize: number;
  mapWidth: number;
  mapHeight: number;
  layers: Layer[];
}

export interface LayerPlaneProps {
  layerData: TileMapData;
  zIndex: number;
  spritesheetTexture: THREE.Texture;
  tilesPerRow: number;
  position: [number, number, number];
  parallaxFactor: number;
  playerPositionRef: React.MutableRefObject<THREE.Vector3>;
}

export interface PhysicsPlayerProps {
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

export interface TextBoxChoice {
  label: string;
  onSelect: () => void;
}

export type DialogueState = 'idle' | 'greeting' | 'question' | 'decline' | 'battle' | 'victory' | 'defeat';
