import { useRef, useState, useEffect, useCallback } from 'react'
import './Toolbar.scss'
import { useToolbar } from '../../../context/ToolbarContext'

interface ToolbarProps {
  loaded?: boolean
}

function Toolbar({ loaded = false }: ToolbarProps) {
  const { onNavigatePrev, onNavigateNext, onToggleMap, isMapVisible = false, is3DActive = false } = useToolbar()

  const toolbarRef = useRef<HTMLDivElement>(null)
  // Position stored as fraction of viewport (0–1) so it scales on resize
  const [position, setPosition] = useState<{ xPct: number; yPct: number } | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ mouseX: 0, mouseY: 0, elXPct: 0, elYPct: 0 })

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    const toolbar = toolbarRef.current
    if (!toolbar) return

    const rect = toolbar.getBoundingClientRect()
    isDraggingRef.current = true
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      elXPct: rect.left / window.innerWidth,
      elYPct: rect.top / window.innerHeight,
    }

    toolbar.classList.add('dragging')
  }, [])

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      const dx = e.clientX - dragStartRef.current.mouseX
      const dy = e.clientY - dragStartRef.current.mouseY
      setPosition({
        xPct: dragStartRef.current.elXPct + dx / window.innerWidth,
        yPct: dragStartRef.current.elYPct + dy / window.innerHeight,
      })
    }

    const handleMouseUp = () => {
      if (!isDraggingRef.current) return
      isDraggingRef.current = false
      toolbarRef.current?.classList.remove('dragging')
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const positionStyle = position
    ? { left: `${position.xPct * 100}vw`, top: `${position.yPct * 100}vh` }
    : undefined

  return (
    <div
      ref={toolbarRef}
      className={`toolbar ${loaded ? 'loaded' : ''} ${is3DActive ? 'active' : ''} ${position ? 'toolbar--positioned' : ''}`}
      style={positionStyle}
    >
      {/* Top section: Work button | gap | drag handle */}
      <div className="toolbar-top">
        <button
          className={`toolbar-button toolbar-button-tab ${isMapVisible ? 'active' : ''}`}
          onClick={onToggleMap}
          aria-label="Toggle Map"
        >
          work
        </button>
        <div className="toolbar-top-gap" />
        <div className="toolbar-drag" onMouseDown={handleDragStart}>
          <svg xmlns="http://www.w3.org/2000/svg" width="8" height="12" viewBox="0 0 8 12">
            <circle cx="2" cy="2" r="1" fill="white" />
            <circle cx="6" cy="2" r="1" fill="white" />
            <circle cx="2" cy="6" r="1" fill="white" />
            <circle cx="6" cy="6" r="1" fill="white" />
            <circle cx="2" cy="10" r="1" fill="white" />
            <circle cx="6" cy="10" r="1" fill="white" />
          </svg>
        </div>
      </div>

      {/* Bottom section: Navigation arrows + fullscreen */}
      <div className="toolbar-bottom">
        <div className="toolbar-nav">
          <button className="toolbar-button" onClick={onNavigatePrev} aria-label="Previous island">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M31.5932 39.2113C32.9247 40.0586 34.667 39.1022 34.667 37.524V14.4773C34.667 12.8992 32.9247 11.9427 31.5932 12.79L13.4852 24.3133C12.2502 25.0992 12.2502 26.9021 13.4852 27.688L31.5932 39.2113Z" fill="white"/>
            </svg>
          </button>
          <button className="toolbar-button" onClick={onNavigateNext} aria-label="Next island">
            <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20.4068 39.2113C19.0753 40.0586 17.333 39.1022 17.333 37.524V14.4773C17.333 12.8992 19.0753 11.9427 20.4068 12.79L38.5148 24.3133C39.7498 25.0992 39.7498 26.9021 38.5148 27.688L20.4068 39.2113Z" fill="white"/>
            </svg>
          </button>
        </div>
        <button className="toolbar-button" onClick={() => {
          if (document.fullscreenElement) {
            document.exitFullscreen()
          } else {
            document.documentElement.requestFullscreen()
          }
        }} aria-label="Toggle Fullscreen">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14">
            <path d="M1 5V2C1 1.448 1.448 1 2 1H5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M9 1H12C12.552 1 13 1.448 13 2V5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M13 9V12C13 12.552 12.552 13 12 13H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            <path d="M5 13H2C1.448 13 1 12.552 1 12V9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

export default Toolbar
