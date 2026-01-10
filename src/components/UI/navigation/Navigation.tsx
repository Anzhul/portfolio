import { useEffect, useState } from 'react'
import { useNavigation } from '../../../context/NavigationContext'
import { usePageTransition } from '../../../context/PageTransitionContext'
import './Navigation.scss'

function Navigation() {
  const [loaded, setLoaded] = useState(false)
  const { last3DRoute } = useNavigation()
  const { triggerTransition } = usePageTransition()

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

  return (
    <nav className={`navigation ${loaded ? 'loaded' : ''}`}>
      <div className="navigation-header">
        <div className="name-button-container">
          <a href="/" onClick={(e) => handleNavClick(e, '/')}>
            <button className="name-button">
              Anzhu Ling
            </button>
          </a>
        </div>
        <div className="nav-links">
          <a href="/projects" className="nav-link" onClick={(e) => handleNavClick(e, '/projects')}>
            <button className="projects-button">
              projects
            </button>
          </a>
          <a href={last3DRoute} className="nav-link" onClick={(e) => handleNavClick(e, last3DRoute)}>explore</a>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
