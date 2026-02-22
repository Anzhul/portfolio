import { createContext, useContext } from 'react'

export const SceneVisibilityContext = createContext(true)

export function useSceneVisible() {
  return useContext(SceneVisibilityContext)
}
