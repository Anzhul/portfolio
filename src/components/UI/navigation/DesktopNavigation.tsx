import { Link } from 'react-router-dom'
import './DesktopNavigation.scss'
import { useMenu } from '../../../context/MenuContext'

interface DesktopNavigationProps {
  vase: React.ReactNode
}

function DesktopNavigation({ vase }: DesktopNavigationProps) {

    const { isMenuOpen, setIsMenuOpen } = useMenu()
  
    const toggleMenu = () => {
      setIsMenuOpen(!isMenuOpen)
    }
  
  return (
    <nav className="desktop-navigation">
      <div className="navigation-header">
        <div className="name-button-container">
          <Link to="/">
            <button className="name-button">
              Anzhu Ling
            </button>
          </Link>
        </div>
        <div className="spacer"></div>
        <div className="menu-button-container">
          <button
            className="menu-button"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            aria-expanded={isMenuOpen}
          >
            <div className={`menu-text-open ${isMenuOpen ? 'open' : ''}`}>
              <span>M</span>
              <span>e</span>
              <span>n</span>
              <span>u</span>
            </div>
            <div className={`menu-text-closed ${isMenuOpen ? 'open' : ''}`}>
              <span>C</span>
              <span>l</span>
              <span>o</span>
              <span>s</span>
              <span>e</span>
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="11.203" height="11.203" viewBox="0 0 11.203 11.203">
                  <path id="Union_8" data-name="Union 8" d="M2086.341-6348.786l-3.341-3.342-3.341,3.342a1.324,1.324,0,0,1-1.872,0,1.327,1.327,0,0,1,0-1.873l3.341-3.341-3.341-3.341a1.324,1.324,0,0,1,0-1.872,1.324,1.324,0,0,1,1.872,0l3.341,3.341,3.341-3.341a1.324,1.324,0,0,1,1.872,0,1.324,1.324,0,0,1,0,1.872l-3.342,3.341,3.342,3.341a1.324,1.324,0,0,1,0,1.873,1.321,1.321,0,0,1-.936.388A1.321,1.321,0,0,1,2086.341-6348.786Z" transform="translate(-2077.398 6359.601)" fill="#ff5a1e"/>
                </svg>
              </span>
            </div>
          </button>
        </div>
      </div>
      <div className={`navigation-menu ${isMenuOpen ? 'open' : ''}`}>
        <div className={`about-box ${isMenuOpen ? 'open' : ''}`}>
          <h2 className="about-header">
            <Link to="/">About</Link>
          </h2>
          <p className="about-text">
            Anzhu is an interactive developer and artist. 
          <br></br>
          <br></br>
            His current focus is on  integrating large data sets with visual displays.
          </p>
        </div>
        <div className={`personal-box ${isMenuOpen ? 'open' : ''}`}>
          <div className="vase">
            {vase}
          </div>
          <div className='personal-work'>
            <h2 className="personal-header">
              <Link to="/personal">Personal work</Link>
            </h2>
          </div>
        </div>
        <div className={`projects-box ${isMenuOpen ? 'open' : ''}`}>
          <h2 className="project-header">
            <Link to="/projects">Projects</Link>
          </h2>
          <ul className="project-links">
            <li>
              <Link to="/project1">IIIFViewer</Link>
              <span className="year"> (2025)</span>
            </li>
            <li>
              <Link to="/project2">30 Visualizations</Link>
            </li>
            <li>
              <Link to="/project3">Project 3</Link>
            </li>
          </ul>
        </div>
        <div className={`miscellaneous-box ${isMenuOpen ? 'open' : ''}`}>
          <div className={`external-links ${isMenuOpen ? 'open' : ''}`}>
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
        </div>
      </div>
    </nav>
  )
}

export default DesktopNavigation
