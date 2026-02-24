import type { BoundaryConfig, BoundaryState } from '../../context/BoundaryContext'
import type { CameraContextType } from '../../context/CameraContext'
import type { IslandData } from '../../context/WorldContext'
import { findClosestEntity, type EntityPosition } from '../../utils/routing'

interface BoundaryData {
  position: [number, number, number];
  config: BoundaryConfig;
  state: BoundaryState;
}

interface ViewportBounds {
  viewportLeft: number;
  viewportTop: number;
  viewportRight: number;
  viewportBottom: number;
  worldPosition: [number, number, number];
  cameraZoom: number;
}

type PreloadCallback = () => void;
type RouteChangeCallback = (entity: EntityPosition | null) => void;

export class BoundaryManager {
  private islands: Map<string, BoundaryData> = new Map();
  private sections: Map<string, BoundaryData> = new Map();
  private sectionIslandMap: Map<string, string> = new Map();  // Maps section ID to island ID
  private camera: CameraContextType;
  private unsubscribe?: () => void;
  private preloadCallbacks: Map<string, PreloadCallback> = new Map();
  private preloadedEntities: Set<string> = new Set();
  private routeChangeCallbacks: Set<RouteChangeCallback> = new Set();
  private currentClosestEntity: EntityPosition | null = null;
  private cachedViewportBounds: ViewportBounds | null = null;
  private lastCheckPos: [number, number] = [NaN, NaN];
  private lastCheckZoom: number = NaN;

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
    const viewportBounds = this.calculateViewportBounds();
    this.checkIslandBoundary(island.id, viewportBounds);
  }

  // Unregister an island
  unregisterIsland(islandId: string) {
    this.islands.delete(islandId);
    this.preloadCallbacks.delete(islandId);
    this.preloadedEntities.delete(islandId);
  }

  // Register a section with its boundary configuration
  registerSection(
    section: { id: string; position: [number, number, number]; islandId?: string },
    config: BoundaryConfig
  ) {
    this.sections.set(section.id, {
      position: section.position,
      config,
      state: {
        isLoaded: false,
        isActive: false,
        distanceToCamera: Infinity,
      },
    });

    // Track section-to-island mapping for routing
    if (section.islandId) {
      this.sectionIslandMap.set(section.id, section.islandId);
    }

    // Check immediately in case camera is already within boundaries
    const viewportBounds = this.calculateViewportBounds();
    this.checkSectionBoundary(section.id, viewportBounds);
  }

  // Unregister a section
  unregisterSection(sectionId: string) {
    this.sections.delete(sectionId);
    this.preloadCallbacks.delete(sectionId);
    this.preloadedEntities.delete(sectionId);
    this.sectionIslandMap.delete(sectionId);
  }

  // Get current boundary state for an island
  getIslandState(islandId: string): BoundaryState | null {
    const island = this.islands.get(islandId);
    return island ? { ...island.state } : null;
  }

  // Get island position
  getIslandPosition(islandId: string): [number, number, number] | null {
    const island = this.islands.get(islandId);
    return island ? island.position : null;
  }

  // Get current boundary state for a section
  getSectionState(sectionId: string): BoundaryState | null {
    const section = this.sections.get(sectionId);
    return section ? { ...section.state } : null;
  }

  // Register a preload callback for an island or section (triggered at 2x loadRadius)
  registerPreload(entityId: string, callback: PreloadCallback) {
    this.preloadCallbacks.set(entityId, callback);
  }

  // Check if an entity (island or section) has been preloaded
  isPreloaded(entityId: string): boolean {
    return this.preloadedEntities.has(entityId);
  }

  // Subscribe to route changes (when closest entity changes)
  onRouteChange(callback: RouteChangeCallback): () => void {
    this.routeChangeCallbacks.add(callback);
    return () => {
      this.routeChangeCallbacks.delete(callback);
    };
  }

  // Get the section-to-island mapping
  getSectionIslandMap(): Map<string, string> {
    return this.sectionIslandMap;
  }

  // Update island DOM element classes directly (bypasses React re-renders)
  private updateIslandDOM(islandId: string, isActive: boolean): void {
    const element = document.querySelector(`[data-island-id="${islandId}"]`);
    if (element) {
      if (isActive) {
        element.classList.add('active');
      } else {
        element.classList.remove('active');
      }
    }
  }

  // Calculate viewport bounds in world space - cached per frame for all boundary checks
  private calculateViewportBounds(): ViewportBounds {
    const { worldPosition, zoom } = this.camera.getState();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Viewport extends half-viewport in each direction from camera center, divided by zoom
    const halfW = vw / (2 * zoom);
    const halfH = vh / (2 * zoom);

    return {
      viewportLeft: worldPosition[0] - halfW,
      viewportTop: worldPosition[1] - halfH,
      viewportRight: worldPosition[0] + halfW,
      viewportBottom: worldPosition[1] + halfH,
      worldPosition,
      cameraZoom: zoom,
    };
  }

  // Check all islands and sections against current camera position
  private checkAllBoundaries() {
    // Skip if camera hasn't moved enough since last check (50 world units threshold)
    const state = this.camera.getState();
    const dx = Math.abs(state.worldPosition[0] - this.lastCheckPos[0]);
    const dy = Math.abs(state.worldPosition[1] - this.lastCheckPos[1]);
    const dz = Math.abs(state.zoom - this.lastCheckZoom);
    if (dx < 50 && dy < 50 && dz < 0.01) return;
    this.lastCheckPos = [state.worldPosition[0], state.worldPosition[1]];
    this.lastCheckZoom = state.zoom;

    // Calculate viewport bounds ONCE per frame, then reuse for all boundary checks
    const viewportBounds = this.calculateViewportBounds();
    this.cachedViewportBounds = viewportBounds;

    this.islands.forEach((_, islandId) => {
      this.checkIslandBoundary(islandId, viewportBounds);
    });
    this.sections.forEach((_, sectionId) => {
      this.checkSectionBoundary(sectionId, viewportBounds);
    });

    // Update current route based on closest entity to viewport top-left
    // This will reuse cachedViewportBounds instead of recalculating
    this.updateCurrentRoute();
  }

  // Update the current route based on viewport position
  private updateCurrentRoute() {
    // Reuse cached viewport bounds instead of recalculating
    if (!this.cachedViewportBounds) {
      return; // No cached bounds available, skip
    }

    const { viewportLeft, viewportTop, viewportRight, viewportBottom } = this.cachedViewportBounds;

    // Calculate center of viewport
    const viewportCenterX = (viewportLeft + viewportRight) / 2;
    const viewportCenterY = (viewportTop + viewportBottom) / 2;
    const viewportCenter: [number, number] = [viewportCenterX, viewportCenterY];

    // Find active islands (within activeRadius)
    const activeIslands = new Map<string, BoundaryData>();
    this.islands.forEach((island, id) => {
      if (island.state.isActive) {
        activeIslands.set(id, island);
      }
    });

    let closestEntity: EntityPosition | null = null;

    if (activeIslands.size > 0) {
      // Find the closest active island to viewport center
      closestEntity = findClosestEntity(
        activeIslands,
        new Map(),  // Sections are not used for routing
        viewportCenter
      );
    }
    // If no active islands, closestEntity stays null (route to /)

    // Check if route changed
    const routeChanged =
      !this.currentClosestEntity && closestEntity !== null ||
      this.currentClosestEntity && closestEntity === null ||
      (this.currentClosestEntity && closestEntity &&
        (this.currentClosestEntity.id !== closestEntity.id ||
         this.currentClosestEntity.type !== closestEntity.type));

    if (routeChanged) {
      this.currentClosestEntity = closestEntity;
      // Notify all subscribers
      this.routeChangeCallbacks.forEach(callback => callback(closestEntity));
    }
  }

  // Check a specific island's boundaries
  private checkIslandBoundary(islandId: string, viewportBounds: ViewportBounds) {
    const island = this.islands.get(islandId);
    if (!island) return;

    const { viewportLeft, viewportTop, viewportRight, viewportBottom, worldPosition, cameraZoom } = viewportBounds;

    const scaledLoadRadius = island.config.loadRadius;
    const scaledActiveRadius = island.config.activeRadius;

    const previousState = { ...island.state };

    // Manhattan distance from camera center to island (world space)
    const dx = Math.abs(worldPosition[0] - island.position[0]);
    const dy = Math.abs(worldPosition[1] - island.position[1]);
    island.state.distanceToCamera = dx + dy;

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

    if (shouldPreload && !this.preloadedEntities.has(islandId)) {
      const callback = this.preloadCallbacks.get(islandId);
      if (callback) {
        console.log(`✨ Preloading island "${islandId}" (approx distance: ${island.state.distanceToCamera.toFixed(0)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
        callback();
        this.preloadedEntities.add(islandId);
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

    // Update DOM directly instead of triggering React re-renders
    if (wasActive !== isActive) {
      this.updateIslandDOM(islandId, isActive);
    }

    // Fire events on state changes
    if (!wasLoaded && isLoaded) {
      //console.log(`🌴 Island "${islandId}" LOADING (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
    if (wasLoaded && !isLoaded) {
      //console.log(`🌴 Island "${islandId}" UNLOADING (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }

    if (!wasActive && isActive) {
      //console.log(`⚡ Island "${islandId}" ACTIVE (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
    if (wasActive && !isActive) {
      //console.log(`💤 Island "${islandId}" INACTIVE (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
  }

  // Check a specific section's boundaries (same logic as islands)
  private checkSectionBoundary(sectionId: string, viewportBounds: ViewportBounds) {
    const section = this.sections.get(sectionId);
    if (!section) return;

    const { viewportLeft, viewportTop, viewportRight, viewportBottom, worldPosition, cameraZoom } = viewportBounds;

    const scaledLoadRadius = section.config.loadRadius;
    const scaledActiveRadius = section.config.activeRadius;

    const previousState = { ...section.state };

    // Manhattan distance from camera center to section (world space)
    const dx = Math.abs(worldPosition[0] - section.position[0]);
    const dy = Math.abs(worldPosition[1] - section.position[1]);
    section.state.distanceToCamera = dx + dy;

    // Check preload zone (2x loadRadius)
    const preloadRadius = scaledLoadRadius * 2;
    const shouldPreload = this.circleIntersectsRect(
      section.position[0],
      section.position[1],
      preloadRadius,
      viewportLeft,
      viewportTop,
      viewportRight,
      viewportBottom
    );

    if (shouldPreload && !this.preloadedEntities.has(sectionId)) {
      const callback = this.preloadCallbacks.get(sectionId);
      if (callback) {
        console.log(`✨ Preloading section "${sectionId}" (approx distance: ${section.state.distanceToCamera.toFixed(0)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
        callback();
        this.preloadedEntities.add(sectionId);
        this.preloadCallbacks.delete(sectionId);
      }
    }

    // Check load boundary
    const wasLoaded = previousState.isLoaded;
    const isLoaded = this.circleIntersectsRect(
      section.position[0],
      section.position[1],
      scaledLoadRadius,
      viewportLeft,
      viewportTop,
      viewportRight,
      viewportBottom
    );
    section.state.isLoaded = isLoaded;

    // Check active boundary
    const wasActive = previousState.isActive;
    const isActive = this.circleIntersectsRect(
      section.position[0],
      section.position[1],
      scaledActiveRadius,
      viewportLeft,
      viewportTop,
      viewportRight,
      viewportBottom
    );
    section.state.isActive = isActive;

    // Fire events on state changes
    if (!wasLoaded && isLoaded) {
      //console.log(`📄 Section "${sectionId}" LOADING (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
    if (wasLoaded && !isLoaded) {
      //console.log(`📄 Section "${sectionId}" UNLOADING (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }

    if (!wasActive && isActive) {
      //console.log(`✨ Section "${sectionId}" ACTIVE (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
    }
    if (wasActive && !isActive) {
      //console.log(`💤 Section "${sectionId}" INACTIVE (distance: ${distance.toFixed(2)}px, zoom: ${cameraZoom.toFixed(2)}x)`);
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
