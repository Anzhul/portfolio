import { createContext, useContext } from 'react'

type Position3D = [number, number, number]

interface IslandContextValue {
  position: Position3D
  id: string
}

const IslandPositionContext = createContext<IslandContextValue>({
  position: [0, 0, 0],
  id: '',
})

export const IslandPositionProvider = IslandPositionContext.Provider

/**
 * Returns the position of the enclosing Island.
 * Defaults to [0, 0, 0] if used outside an Island.
 */
export function useIslandPosition(): Position3D {
  return useContext(IslandPositionContext).position
}

/**
 * Returns the ID of the enclosing Island.
 */
export function useIslandId(): string {
  return useContext(IslandPositionContext).id
}
