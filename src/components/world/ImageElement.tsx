import { useViewport } from '../../context/ViewportContext'

interface ImageElementProps {
  imageUrl: string
  position?: [number, number, number]
  mobilePosition?: [number, number, number]
  height?: number
  width?: number
  mobileHeight?: number
  mobileWidth?: number
  opacity?: number
}

/**
 * Renders an image as an HTML <img> element positioned in world space.
 * Unlike ImagePlane (which uploads textures to the GPU via Three.js),
 * this uses the browser's compositor thread for async GPU compositing —
 * zero main-thread blocking during load.
 *
 * Must be used inside an <Island> component. Position is an offset
 * from the island center, matching ImagePlane's coordinate system.
 */
export function ImageElement({
  imageUrl,
  position = [0, 0, 0],
  mobilePosition,
  height = 100,
  width = 100,
  mobileHeight,
  mobileWidth,
  opacity = 1,
}: ImageElementProps) {
  const { isMobileOnly } = useViewport()

  const actualPosition = isMobileOnly && mobilePosition ? mobilePosition : position
  const actualHeight = isMobileOnly && mobileHeight !== undefined ? mobileHeight : height
  const actualWidth = isMobileOnly && mobileWidth !== undefined ? mobileWidth : width

  return (
    <img
      src={imageUrl}
      alt=""
      decoding="async"
      draggable={false}
      style={{
        position: 'absolute',
        left: `${actualPosition[0]}px`,
        top: `${actualPosition[1]}px`,
        transform: 'translate(-50%, -50%)',
        width: `${actualWidth}px`,
        height: `${actualHeight}px`,
        opacity,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    />
  )
}
