import { createContext, useContext, useMemo, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { BoundaryManager } from '../components/boundary/BoundaryManager'
import { useCamera } from './CameraContext'
import type { BoundaryState } from '../components/boundary/boundary'

interface BoundaryContextType {
  manager: BoundaryManager;
}

const BoundaryContext = createContext<BoundaryContextType | undefined>(undefined)

export function BoundaryProvider({ children }: { children: ReactNode }) {
  const camera = useCamera();

  // Create BoundaryManager instance once
  const manager = useMemo(() => new BoundaryManager(camera), [camera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => manager.destroy();
  }, [manager]);

  const contextValue = useMemo(() => ({ manager }), [manager]);

  return (
    <BoundaryContext.Provider value={contextValue}>
      {children}
    </BoundaryContext.Provider>
  );
}

export function useBoundary() {
  const context = useContext(BoundaryContext);
  if (context === undefined) {
    throw new Error('useBoundary must be used within a BoundaryProvider');
  }
  return context;
}

// Hook to get reactive boundary state for an island
export function useBoundaryState(islandId: string): BoundaryState {
  const { manager } = useBoundary();
  const camera = useCamera();

  // Initialize with current state
  const [state, setState] = useState<BoundaryState>(() =>
    manager.getIslandState(islandId) || {
      isLoaded: false,
      isActive: false,
      distanceToCamera: Infinity,
    }
  );

  useEffect(() => {
    // Subscribe to camera updates to reactively update state
    const unsubscribe = camera.subscribe(() => {
      const newState = manager.getIslandState(islandId);
      if (newState) {
        setState(newState);
      }
    });

    return unsubscribe;
  }, [camera, manager, islandId]);

  return state;
}
