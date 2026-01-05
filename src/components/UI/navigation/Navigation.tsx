import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigation } from '../../../context/NavigationContext'
import './Navigation.scss'

function Navigation() {
  const [loaded, setLoaded] = useState(false)
  const { last3DRoute } = useNavigation()

  useEffect(() => {
    // Add loaded class after a brief delay to allow initial render
    setTimeout(() => setLoaded(true), 100)
  }, [])

  return (
    <nav className={`navigation ${loaded ? 'loaded' : ''}`}>
      <div className="navigation-header">
        <div className="name-button-container">
          <Link to="/">
            <button className="name-button">
              Anzhu Ling
            </button>
          </Link>
        </div>
        <div className="nav-links">
          <Link to="/projects" className="nav-link">
            <button className="projects-button">
              projects
            </button>
          </Link>
          <Link to={last3DRoute} className="nav-link">explore</Link>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
