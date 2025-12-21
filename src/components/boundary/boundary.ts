// Boundary system types for island loading and activation

export interface BoundaryConfig {
  loadRadius: number;    // Outer boundary - triggers content loading
  activeRadius: number;  // Inner boundary - triggers render loop activation
}

export interface BoundaryState {
  isLoaded: boolean;      // Camera is within load boundary
  isActive: boolean;      // Camera is within active boundary
  distanceToCamera: number;
}

export interface BoundaryEvents {
  onEnterLoad?: (islandId: string) => void;
  onExitLoad?: (islandId: string) => void;
  onEnterActive?: (islandId: string) => void;
  onExitActive?: (islandId: string) => void;
}
