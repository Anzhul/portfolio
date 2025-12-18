import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { useScene } from '../../context/SceneContext'

interface SceneObjectProps {
  id: string
  zIndex?: number
  children: ReactNode
}

/**
 * A component that registers 3D content to the global canvas.
 * Can be used anywhere in your app, not just inside Canvas.
 *
 * All 3D content renders in a single canvas behind HTML content (z-index: 0).
 * HTML content has z-index: 5, so it appears in front of 3D objects.
 * Use the zIndex prop to control render order within the 3D scene (lower renders first).
 *
 * Usage:
 * <SceneObject id="my-box" zIndex={0}>
 *   <mesh position={[0, 0, 0]}>
 *     <boxGeometry />
 *     <meshStandardMaterial color="red" />
 *   </mesh>
 * </SceneObject>
 */
function SceneObject({ id, zIndex = 0, children }: SceneObjectProps) {
  const { addObject, removeObject } = useScene()

  useEffect(() => {
    console.log('Registering SceneObject with id:', id);
    // Register this object when component mounts
    addObject(id, children, zIndex)

    // Unregister when component unmounts
    return () => {
      removeObject(id)
    }
  }, [id, children, zIndex, addObject, removeObject])

  // This component doesn't render anything in the DOM
  return null
}

export default SceneObject
