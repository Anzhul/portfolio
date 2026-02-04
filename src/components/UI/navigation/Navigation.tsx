import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useNavigation } from '../../../context/NavigationContext'
import { usePageTransition } from '../../../context/PageTransitionContext'
import './Navigation.scss'

function Navigation() {
  const [loaded, setLoaded] = useState(false)
  const { last3DRoute } = useNavigation()
  const { triggerTransition } = usePageTransition()
  const location = useLocation()

  useEffect(() => {
    // Wait for all resources to load on initial page load
    const handleLoad = () => {
      // Delay before showing navigation
      setTimeout(() => {
        setLoaded(true)
      }, 100)
    }

    if (document.readyState === 'complete') {
      handleLoad()
    } else {
      window.addEventListener('load', handleLoad)
      return () => window.removeEventListener('load', handleLoad)
    }
  }, [])

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    e.preventDefault()
    triggerTransition(path)
  }

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    if (path === '/projects') {
      return location.pathname === '/projects' || 
             ['/rydmboat', '/iiifviewer', '/syrte', '/arcade_ship'].includes(location.pathname)
    }
    // For explore, it matches if we are currently on the last3DRoute
    return location.pathname === last3DRoute && path === last3DRoute
  }

  return (
    <nav className={`navigation ${loaded ? 'loaded' : ''}`}>
      <div className="navigation-header">
        <div className="name-button-container">
          <a href="/" onClick={(e) => handleNavClick(e, '/')}>
            <button className="name-button">
              Anzhu Ling
            </button>
          </a>
          {isActive('/') && <div className="nav-dot" />}
        </div>
        <div className="nav-links">
          <a href="/projects" className="nav-link" onClick={(e) => handleNavClick(e, '/projects')}>
            <button className="projects-button">
              projects
            </button>
            {isActive('/projects') && <div className="nav-dot" />}
          </a>
          <a href={last3DRoute} className="nav-link" onClick={(e) => handleNavClick(e, last3DRoute)}>
            explore
            {isActive(last3DRoute) && <div className="nav-dot" />}
          </a>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
