import { useEffect, useRef, useMemo } from 'react'
import { useViewport } from '../../../context/ViewportContext'
import { useIslandPosition } from '../../../context/IslandPositionContext'
import { worldRenderer } from '../../../renderer/WorldRenderer'

// R2 base URL for IIIF tiles in production (e.g. "https://pub-xxx.r2.dev")
// In dev, tiles are served from public/ via the Vite dev server
const IIIF_BASE = import.meta.env.VITE_IIIF_BASE_URL || ''

interface IIIFImagePlaneProps {
  infoUrl: string
  position?: [number, number, number]
  mobilePosition?: [number, number, number]
  height?: number
  width?: number
  mobileHeight?: number
  mobileWidth?: number
  zIndex?: number
  opacity?: number
}

export function IIIFImagePlane({
  infoUrl,
  position = [0, 0, 0],
  mobilePosition,
  height = 100,
  width = 100,
  mobileHeight,
  mobileWidth,
  zIndex = 0,
  opacity = 1,
}: IIIFImagePlaneProps) {
  const { isMobileOnly } = useViewport()
  const islandPosition = useIslandPosition()
  const planeId = useRef(`iiif-plane-${Math.random()}`).current

  const actualPosition = isMobileOnly && mobilePosition ? mobilePosition : position
  const actualHeight = isMobileOnly && mobileHeight !== undefined ? mobileHeight : height
  const actualWidth = isMobileOnly && mobileWidth !== undefined ? mobileWidth : width

  const resolvedPosition = useMemo<[number, number, number]>(() => [
    actualPosition[0] + islandPosition[0],
    actualPosition[1] + islandPosition[1],
    actualPosition[2] + islandPosition[2],
  ], [actualPosition[0], actualPosition[1], actualPosition[2], islandPosition[0], islandPosition[1], islandPosition[2]])

  useEffect(() => {
    const resolvedInfoUrl = IIIF_BASE + infoUrl
    console.log(`[IIIFImagePlane] MOUNT ${planeId} → addIIIFImage(${resolvedPosition[0]}, ${resolvedPosition[1]}, ${resolvedPosition[2] + zIndex}, w=${actualWidth}, h=${actualHeight})`)
    worldRenderer.addIIIFImage(
      planeId,
      resolvedInfoUrl,
      resolvedPosition[0],
      resolvedPosition[1],
      resolvedPosition[2] + zIndex,
      actualWidth,
      actualHeight,
      opacity
    )

    return () => {
      console.log(`[IIIFImagePlane] UNMOUNT ${planeId} → removeIIIFImage`)
      worldRenderer.removeIIIFImage(planeId)
    }
  }, [planeId, infoUrl, resolvedPosition, actualWidth, actualHeight, zIndex, opacity])

  return null
}
