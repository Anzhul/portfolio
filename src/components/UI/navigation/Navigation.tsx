import { useEffect, useState } from 'react'
import DesktopNavigation from './DesktopNavigation'
import MobileNavigation from './MobileNavigation'

function Navigation() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Add loaded class after a brief delay to allow initial render
    setTimeout(() => setLoaded(true), 100)
  }, [])

  return (
    <>
      <DesktopNavigation loaded={loaded} />
      <MobileNavigation loaded={loaded} />
    </>
  )
}

export default Navigation
