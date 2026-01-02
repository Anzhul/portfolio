import { Link } from 'react-router-dom'
import { useNavigation } from '../../../context/NavigationContext'
import './DesktopNavigation.scss'

interface DesktopNavigationProps {
  loaded?: boolean
}

function DesktopNavigation({ loaded = false }: DesktopNavigationProps) {
  const { last3DRoute } = useNavigation()

  return (
    <nav className={`desktop-navigation ${loaded ? 'loaded' : ''}`}>
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

export default DesktopNavigation
