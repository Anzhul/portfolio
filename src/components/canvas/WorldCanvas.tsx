import { useEffect, useRef } from 'react'
import { worldRenderer } from '../../renderer/WorldRenderer'

/**
 * Creates the WebGL canvas and initializes the off-screen worker renderer.
 * This replaces R3FCanvas for 2D image plane rendering.
 *
 * The canvas is created imperatively inside the effect so that React Strict Mode
 * (which double-mounts) gets a fresh canvas each time — transferControlToOffscreen()
 * can only be called once per canvas element.
 */
export function WorldCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Create canvas imperatively so each mount gets a fresh element
    const canvas = document.createElement('canvas')
    canvas.style.position = 'fixed'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '0'
    container.appendChild(canvas)

    const dpr = window.devicePixelRatio || 1
    worldRenderer.init(canvas, dpr)

    // Handle resize
    const onResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      const currentDpr = window.devicePixelRatio || 1
      worldRenderer.resize(w, h, currentDpr)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      worldRenderer.destroy()
      canvas.remove()
    }
  }, [])

  return <div ref={containerRef} />
}
