export interface CameraPosition {
  x: number;
  y: number;
  z: number;
}

export interface CameraState {
  position: CameraPosition;
  scale: number;
  rotation: number;
}

export interface CameraTransformMatrices {
  view: Float32Array;
  projection: Float32Array;
}

export interface CameraBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  near: number;
  far: number;
}

export interface ViewportDimensions {
  width: number;
  height: number;
}

export interface DragState {
  isDragging: boolean;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export const WORLD_SCALE = 100; // 1 world unit = 100 pixels
export const DEFAULT_FOV = Math.PI / 4; // 45 degrees
export const DEFAULT_NEAR = 0.1;
export const DEFAULT_FAR = 10000;
