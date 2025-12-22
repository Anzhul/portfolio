import type { BoundaryConfig, BoundaryState } from './boundary'
import type { CameraContextType } from '../../context/CameraContext'
import type { IslandData } from '../../context/WorldContext'

interface IslandBoundaryData {
  position: [number, number, number];
  config: BoundaryConfig;
  state: BoundaryState;
}

type PreloadCallback = () => void;

export class BoundaryManager {
  private islands: Map<string, IslandBoundaryData> = new Map();
  private camera: CameraContextType;
  private unsubscribe?: () => void;
  private preloadCallbacks: Map<string, PreloadCallback> = new Map();
  private preloadedIslands: Set<string> = new Set();

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
    this.preloadCallbacks.delete(islandId);
    this.preloadedIslands.delete(islandId);
  }

  // Get current boundary state for an island
  getIslandState(islandId: string): BoundaryState | null {
    const island = this.islands.get(islandId);
    return island ? { ...island.state } : null;
  }

  // Register a preload callback for an island (triggered at 2x loadRadius)
  registerPreload(islandId: string, callback: PreloadCallback) {
    this.preloadCallbacks.set(islandId, callback);
  }

  // Check if an island has been preloaded
  isPreloaded(islandId: string): boolean {
    return this.preloadedIslands.has(islandId);
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

    // Calculate viewport bounds in world space
    // CSS transform: translate(cameraPos) scale(zoom)
    // To convert screen coords to world coords: worldPoint = (screenPoint - cameraPos) / zoom


    const zoomoffsetX = (window.innerWidth / 2) - (window.innerWidth * cameraZoom / 2);
    const zoomoffsetY = (window.innerHeight / 2) - (window.innerHeight * cameraZoom / 2);
    // Screen corners
    const screenLeft = -cameraPos[0] - zoomoffsetX;
    const screenTop = -cameraPos[1] - zoomoffsetY;
    const screenRight = screenLeft + window.innerWidth
    const screenBottom = screenTop + window.innerHeight





    // World corners (reversing the transform)

    const viewportLeft = screenLeft / cameraZoom;
    const viewportTop = screenTop / cameraZoom;
    const viewportRight =  screenRight / cameraZoom;
    const viewportBottom = screenBottom / cameraZoom;

    //console.log(`x: ${cameraPos[0]}, y: ${cameraPos[1]}, zoom: ${cameraZoom.toFixed(2)}`);

    //console.log(`Camera Pos: (${cameraPos[0].toFixed(0)}, ${cameraPos[1].toFixed(0)}), Zoom: ${cameraZoom.toFixed(2)}x, Viewport: (${viewportLeft.toFixed(0)}, ${viewportTop.toFixed(0)}) to (${viewportRight.toFixed(0)}, ${viewportBottom.toFixed(0)})` );

    // Boundaries are defined in world space, no scaling needed
    const scaledLoadRadius = island.config.loadRadius;
    const scaledActiveRadius = island.config.activeRadius;

    // Check if boundary circles intersect with viewport rectangle
    const previousState = { ...island.state };

    // Calculate distance for logging purposes
    const viewportCenterX = cameraPos[0];
    const viewportCenterY = cameraPos[1];
    const distance = Math.sqrt(
      Math.pow(viewportCenterX - island.position[0], 2) +
      Math.pow(viewportCenterY - island.position[1], 2)
    );
    island.state.distanceToCamera = distance;

    // Check preload zone (2x loadRadius) and trigger preload callback
    const preloadRadius = scaledLoadRadius * 2;
    const shouldPreload = this.circleIntersectsRect(
      island.position[0],
      island.position[1],
      preloadRadius,
      viewportLeft,
      viewportTop,
      viewportRight,
      viewportBottom
    );

    if (shouldPreload && !this.preloadedIslands.has(islandId)) {
      const callback = this.preloadCallbacks.get(islandId);
      if (callback) {
        console.log(`✨ Preloading island "${islandId}" (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
        callback();
        this.preloadedIslands.add(islandId);
        this.preloadCallbacks.delete(islandId); // Only preload once
      }
    }

    // Check load boundary (outer circle) intersection with viewport
    const wasLoaded = previousState.isLoaded;
    const isLoaded = this.circleIntersectsRect(
      island.position[0],
      island.position[1],
      scaledLoadRadius,
      viewportLeft,
      viewportTop,
      viewportRight,
      viewportBottom
    );
    island.state.isLoaded = isLoaded;

    // Check active boundary (inner circle) intersection with viewport
    const wasActive = previousState.isActive;
    const isActive = this.circleIntersectsRect(
      island.position[0],
      island.position[1],
      scaledActiveRadius,
      viewportLeft,
      viewportTop,
      viewportRight,
      viewportBottom
    );
    island.state.isActive = isActive;

    // Fire events on state changes
    if (!wasLoaded && isLoaded) {
      console.log(`🌴 Island "${islandId}" LOADING (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
    if (wasLoaded && !isLoaded) {
      console.log(`🌴 Island "${islandId}" UNLOADING (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }

    if (!wasActive && isActive) {
      console.log(`⚡ Island "${islandId}" ACTIVE (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
    if (wasActive && !isActive) {
      console.log(`💤 Island "${islandId}" INACTIVE (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
  }

  // Check if a circle intersects with a rectangle (viewport)
  // Uses closest point on rectangle to circle center approach
  private circleIntersectsRect(
    circleX: number,
    circleY: number,
    radius: number,
    rectLeft: number,
    rectTop: number,
    rectRight: number,
    rectBottom: number
  ): boolean {
    // Find the closest point on the rectangle to the circle's center

//console.log(`Circle center: (${circleX.toFixed(2)}, ${circleY.toFixed(2)}), Radius: ${radius.toFixed(2)}`);

//console.log(`Rectangle: Left=${rectLeft.toFixed(2)}, Top=${rectTop.toFixed(2)}, Right=${rectRight.toFixed(2)}, Bottom=${rectBottom.toFixed(2)}`);

    const closestX = Math.max(rectLeft, Math.min(circleX, rectRight));
    const closestY = Math.max(rectTop, Math.min(circleY, rectBottom));

    // Calculate distance from circle center to this closest point
    const distanceX = circleX - closestX;
    const distanceY = circleY - closestY;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    // Circle intersects if distance is less than radius
    return distanceSquared <= radius * radius;
  }

  // Cleanup
  destroy() {
    this.unsubscribe?.();
    this.islands.clear();
  }
}
