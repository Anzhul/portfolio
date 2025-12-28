import { useEffect, useRef, useCallback } from 'react'
import { loadingManager } from '../utils/SimpleLoadingManager'

interface UseSimpleLoadingOptions {
  islandId: string
}

/**
 * Simple hook to track loading of a component
 *
 * Optimized to:
 * - Only register once per mount (using ref)
 * - Only mark loaded once (using ref guard)
 * - Use useCallback to return stable function reference
 */
export function useSimpleLoading({ islandId }: UseSimpleLoadingOptions) {
  const registeredRef = useRef(false)
  const loadedRef = useRef(false)

  // Register on mount
  useEffect(() => {
    if (!registeredRef.current) {
      registeredRef.current = true
      loadingManager.register(islandId)
    }
  }, [islandId])

  // Return a stable function reference to mark as loaded
  const markLoaded = useCallback(() => {
    if (!loadedRef.current) {
      loadedRef.current = true
      loadingManager.markLoaded(islandId)
    }
  }, [islandId])

  return { markLoaded }
}
