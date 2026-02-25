import { useEffect, useRef, useMemo } from 'react'
import { useViewport } from '../../../context/ViewportContext'
import { useIslandPosition } from '../../../context/IslandPositionContext'
import { worldRenderer } from '../../../renderer/WorldRenderer'

interface MaterialOverride {
  color?: [number, number, number, number]
  roughness?: number
  metallic?: number
}

interface ModelObjectProps {
  src: string
  position?: [number, number, number]
  mobilePosition?: [number, number, number]
  scale?: number
  mobileScale?: number
  rotation?: [number, number, number]
  mobileRotation?: [number, number, number]
  zIndex?: number
  opacity?: number
  materials?: Record<number, MaterialOverride>
}

export function ModelObject({
  src,
  position = [0, 0, 0],
  mobilePosition,
  scale = 1,
  mobileScale,
  rotation = [0, 0, 0],
  mobileRotation,
  zIndex = 0,
  opacity = 1,
  materials,
}: ModelObjectProps) {
  const { isMobileOnly } = useViewport()
  const islandPosition = useIslandPosition()
  const modelId = useRef(`model-${Math.random()}`).current
  const hasMounted = useRef(false)

  const actualPosition = isMobileOnly && mobilePosition ? mobilePosition : position
  const actualScale = isMobileOnly && mobileScale !== undefined ? mobileScale : scale
  const actualRotation = isMobileOnly && mobileRotation ? mobileRotation : rotation

  const resolvedPosition = useMemo<[number, number, number]>(() => [
    actualPosition[0] + islandPosition[0],
    actualPosition[1] + islandPosition[1],
    actualPosition[2] + islandPosition[2],
  ], [actualPosition[0], actualPosition[1], actualPosition[2], islandPosition[0], islandPosition[1], islandPosition[2]])

  // Stabilize materials reference — only change when values actually differ
  const materialsJson = materials ? JSON.stringify(materials) : null
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stableMaterials = useMemo(() => materials ?? null, [materialsJson])

  // Mount: fetch + upload model. Unmount: remove model.
  // Only re-runs if the GLB source file changes.
  useEffect(() => {
    worldRenderer.addModel(
      modelId,
      src,
      resolvedPosition[0],
      resolvedPosition[1],
      resolvedPosition[2] + zIndex,
      actualScale,
      actualRotation[0],
      actualRotation[1],
      actualRotation[2],
      opacity,
      stableMaterials
    )
    hasMounted.current = true

    return () => {
      worldRenderer.removeModel(modelId)
      hasMounted.current = false
    }
    // Only re-add when the model file itself changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelId, src])

  // Update transform/materials without removing the model (no flash)
  useEffect(() => {
    if (!hasMounted.current) return
    worldRenderer.updateModel(
      modelId,
      resolvedPosition[0],
      resolvedPosition[1],
      resolvedPosition[2] + zIndex,
      actualScale,
      actualRotation[0],
      actualRotation[1],
      actualRotation[2],
      opacity,
      stableMaterials
    )
  }, [modelId, resolvedPosition, actualScale, actualRotation[0], actualRotation[1], actualRotation[2], zIndex, opacity, stableMaterials])

  return null
}
