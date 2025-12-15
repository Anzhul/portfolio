import { useState, useEffect } from 'react'
import DesktopNavigation from './DesktopNavigation'
import MobileNavigation from './MobileNavigation'
import VaseR3F from './VaseR3F'

function Navigation() {
  // Initialize with correct value immediately to avoid flash
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false // SSR safety
    return window.matchMedia('(max-width: 768px)').matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return (
    <>
      <DesktopNavigation vase={!isMobile ? <VaseR3F /> : null} />
      <MobileNavigation vase={isMobile ? <VaseR3F /> : null} />
    </>
  )
}

export default Navigation
