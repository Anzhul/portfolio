import type { BoundaryConfig, BoundaryState } from './boundary'
import type { CameraContextType } from '../../context/CameraContext'
import type { IslandData } from '../../context/WorldContext'

interface IslandBoundaryData {
  position: [number, number, number];
  config: BoundaryConfig;
  state: BoundaryState;
}

export class BoundaryManager {
  private islands: Map<string, IslandBoundaryData> = new Map();
  private camera: CameraContextType;
  private unsubscribe?: () => void;

  constructor(camera: CameraContextType) {
    this.camera = camera;

    // Subscribe to camera position updates (automatically throttled at 100ms)
    this.unsubscribe = camera.subscribe(() => {
      this.checkAllBoundaries();
    });
  }

  // Register an island with its boundary configuration
  registerIsland(island: IslandData, config: BoundaryConfig) {
    this.islands.set(island.id, {
      position: island.position,
      config,
      state: {
        isLoaded: false,
        isActive: false,
        distanceToCamera: Infinity,
      },
    });

    // Check immediately in case camera is already within boundaries
    this.checkIslandBoundary(island.id);
  }

  // Unregister an island
  unregisterIsland(islandId: string) {
    this.islands.delete(islandId);
  }

  // Get current boundary state for an island
  getIslandState(islandId: string): BoundaryState | null {
    const island = this.islands.get(islandId);
    return island ? { ...island.state } : null;
  }

  // Check all islands against current camera position
  private checkAllBoundaries() {
    this.islands.forEach((_, islandId) => {
      this.checkIslandBoundary(islandId);
    });
  }

  // Check a specific island's boundaries
  private checkIslandBoundary(islandId: string) {
    const island = this.islands.get(islandId);
    if (!island) return;

    // Camera position and zoom
    const cameraPos = this.camera.getState().position;
    const cameraZoom = this.camera.getState().zoom;

    // Calculate viewport center in world space
    // Camera position - half viewport dimensions = center of screen
    const viewportCenterX = cameraPos[0] - window.innerWidth / 2;
    const viewportCenterY = cameraPos[1] - window.innerHeight / 2;
    const viewportCenter: [number, number, number] = [viewportCenterX, viewportCenterY, cameraPos[2]];

    const distance = this.calculateDistance(viewportCenter, island.position);

    // Scale distance by zoom for consistent visual perception
    // When zoomed in (zoom > 1), effective distance is smaller
    // When zoomed out (zoom < 1), effective distance is larger
    const effectiveDistance = distance / cameraZoom;

    // Store raw distance
    const previousState = { ...island.state };
    island.state.distanceToCamera = distance;

    // Check load boundary (outer) using effective distance
    const wasLoaded = previousState.isLoaded;
    const isLoaded = effectiveDistance <= island.config.loadRadius;
    island.state.isLoaded = isLoaded;

    // Check active boundary (inner) using effective distance
    const wasActive = previousState.isActive;
    const isActive = effectiveDistance <= island.config.activeRadius;
    island.state.isActive = isActive;

    // Fire events on state changes
    if (!wasLoaded && isLoaded) {
      console.log(`🌴 Island "${islandId}" LOADING (effective: ${effectiveDistance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
    if (wasLoaded && !isLoaded) {
      console.log(`🌴 Island "${islandId}" UNLOADING (effective: ${effectiveDistance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }

    if (!wasActive && isActive) {
      console.log(`⚡ Island "${islandId}" ACTIVE (effective: ${effectiveDistance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
    if (wasActive && !isActive) {
      console.log(`💤 Island "${islandId}" INACTIVE (effective: ${effectiveDistance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
  }

  // Calculate 2D distance between camera and island (ignore z axis)
  private calculateDistance(
    pos1: [number, number, number],
    pos2: [number, number, number]
  ): number {
    const dx = pos1[0] - pos2[0];
    const dy = pos1[1] - pos2[1];
    // Use squared distance to avoid Math.sqrt (faster)
    // Then take sqrt at the end for actual distance
    
    
    console.log(Math.sqrt(dx * dx + dy * dy));
    return Math.sqrt(dx * dx + dy * dy);
  }

  // Cleanup
  destroy() {
    this.unsubscribe?.();
    this.islands.clear();
  }
}
