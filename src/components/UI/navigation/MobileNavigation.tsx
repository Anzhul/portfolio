import { Link } from 'react-router-dom'
import { useMenu } from '../../../context/MenuContext'
import './MobileNavigation.scss'

interface MobileNavigationProps {
  vase: React.ReactNode
}

function MobileNavigation({ vase }: MobileNavigationProps) {
  //const menuStuff = useMenu()
  //const isMenuOpen = menuStuff.isMenuOpen
  //const setIsMenuOpen = menuStuff.setIsMenuOpen
  const { isMenuOpen, setIsMenuOpen } = useMenu()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <nav className="mobile-navigation">

      {/* Hamburger Button */}
      <button
        className="hamburger"
        onClick={toggleMenu}
        aria-label="Toggle menu"
        aria-expanded={isMenuOpen}
      >
      <div className={`dot1 ${isMenuOpen ? 'open' : ''}`}></div>
      <div className={`dot2 ${isMenuOpen ? 'open' : ''}`}></div>
      <div className={`dot3 ${isMenuOpen ? 'open' : ''}`}></div>
      <div className={`dot4 ${isMenuOpen ? 'open' : ''}`}></div>

      <svg className={`x-lines ${isMenuOpen ? 'open' : ''}`} width="56" height="56" viewBox="0 0 56 56">
        <line className="line1-outline" x1="15" y1="15" x2="41" y2="41" stroke="#BC591F" strokeWidth="7" strokeLinecap="round"/>
        <line className="line2-outline" x1="15" y1="41" x2="41" y2="15" stroke="#BC591F" strokeWidth="7" strokeLinecap="round"/>
        <line className="line1" x1="15" y1="15" x2="41" y2="41" stroke="#FF711E" strokeWidth="5" strokeLinecap="round"/>
        <line className="line2" x1="15" y1="41" x2="41" y2="15" stroke="#FF711E" strokeWidth="5" strokeLinecap="round"/>
      </svg>
      </button>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMenuOpen ? 'open' : ''}`}>
        <div className="menu-content">
          <div className="left-section">
            <div className="logo">
              {vase}
            </div>
            <div className={`miscellaneous-box ${isMenuOpen ? 'open' : ''}`}>
              <div className={`personal-box ${isMenuOpen ? 'open' : ''}`}>
                <h2 className="personal-header">
                  <Link to="/personal">Personal work</Link>
                </h2>
              </div>
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
          <div className="right-section">
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
            <div className={`projects-box ${isMenuOpen ? 'open' : ''}`}>
            <h2 className="project-header">
            <Link to="/projects">Projects</Link>
            </h2>
            <ul className="project-links">
            <li>
              <Link to="/project1">Project 1</Link>
              <span className="year"> (2025)</span>
            </li>
            <li>
              <Link to="/project2">Project 2</Link>
            </li>
            <li>
              <Link to="/project3">Project 3</Link>
            </li>
                        <li>
              <Link to="/project3">Project 3</Link>
            </li>
                        <li>
              <Link to="/project3">Project 3</Link>
            </li>
            </ul>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default MobileNavigation
