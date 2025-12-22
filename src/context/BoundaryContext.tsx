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
  const [manager, setManager] = useState<BoundaryManager | null>(null);

  // Create manager in useEffect to ensure proper cleanup
  useEffect(() => {
    const newManager = new BoundaryManager(camera);
    setManager(newManager);

    return () => {
      newManager.destroy();
    };
  }, [camera]);

  const contextValue = useMemo(() =>
    manager ? { manager } : null,
    [manager]
  );

  // Don't render children until manager is ready
  if (!contextValue) {
    return null;
  }

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

// Hook to get reactive boundary state for a section
export function useSectionBoundaryState(sectionId: string): BoundaryState {
  const { manager } = useBoundary();
  const camera = useCamera();

  // Initialize with current state
  const [state, setState] = useState<BoundaryState>(() =>
    manager.getSectionState(sectionId) || {
      isLoaded: false,
      isActive: false,
      distanceToCamera: Infinity,
    }
  );

  useEffect(() => {
    // Subscribe to camera updates to reactively update state
    const unsubscribe = camera.subscribe(() => {
      const newState = manager.getSectionState(sectionId);
      if (newState) {
        setState(newState);
      }
    });

    return unsubscribe;
  }, [camera, manager, sectionId]);

  return state;
}
