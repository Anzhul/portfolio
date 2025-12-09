import { Link } from 'react-router-dom'
import './DesktopNavigation.scss'

interface DesktopNavigationProps {
  vase: React.ReactNode
}

function DesktopNavigation({ vase }: DesktopNavigationProps) {
  return (
    <nav className="desktop-navigation">
      <div className="logo">
        {vase}
      </div>

      <div className="local-links">
        <ul>
          <li>
            <Link to="/">Anzhu Ling</Link>
          </li>
          <li>
            <Link to="/projects">Projects</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </div>

      <div className="external-links">
        <ul>
          <li>
            <a href="https://www.linkedin.com/in/anzhu-yu-2b4b99199/" target="_blank" rel="noopener noreferrer">Github</a>
          </li>
          <li>
            <a href="">Instagram</a>
          </li>
          <li>
            <a href="mailto:anzhul@umich.edu">anzhul@umich.edu</a>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default DesktopNavigation
