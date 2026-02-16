import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useNavigation } from '../../../context/NavigationContext'
import { usePageTransition } from '../../../context/PageTransitionContext'
import './Navigation.scss'

const NavUnderline = ({ active }: { active: boolean }) => {
  const innerRef = useRef<HTMLDivElement | null>(null)
  const firstRender = useRef(true)
  const [initial, setInitial] = useState(true)

  useEffect(() => {
    // Remove the 'initial' flag on the first animation frame so the very first render doesn't animate
    const id = requestAnimationFrame(() => setInitial(false))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    const el = innerRef.current
    if (!el) return

    if (active) {
      // Prepare off-screen right without transition, then trigger the transition to center
      el.classList.remove('exiting')
      el.classList.add('pre-enter')
      // Force reflow so the browser picks up the pre-enter position
      void el.offsetWidth
      el.classList.add('active')
      el.classList.remove('pre-enter')
    } else {
      // Animate out to left using CSS animation, then reset when animation ends
      el.classList.remove('active')
      const onAnimEnd = () => {
        el.classList.remove('exiting')
        el.removeEventListener('animationend', onAnimEnd)
      }
      el.addEventListener('animationend', onAnimEnd)
      el.classList.add('exiting')
    }
  }, [active])

  return (
    <div className="nav-underline">
      <div
        ref={innerRef}
        className={`underline-inner1 ${initial ? 'initial' : ''} ${active ? 'active' : ''}`}
      />
    </div>
  )
}

function Navigation() {
  const { last3DRoute } = useNavigation()
  const { triggerTransition } = usePageTransition()
  const location = useLocation()

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
    // For art, it matches if we are currently on the last3DRoute
    return location.pathname === last3DRoute && path === last3DRoute
  }

  return (
    <nav className="navigation">
      <div className="navigation-header">
        <div className="name-button-container">
          <a href="/" onClick={(e) => handleNavClick(e, '/')}>
            <button className="name-button">
              Anzhu Ling
            </button>
          </a>
        </div>
        <div className="nav-links">
          <a href="/projects" className={`nav-link ${isActive('/projects') ? 'active' : ''}`} onClick={(e) => handleNavClick(e, '/projects')}>
            <button className="projects-button">
              projects
            </button>
            <NavUnderline active={isActive('/projects')} />
          </a>
          <a href={last3DRoute} className={`nav-link ${isActive(last3DRoute) ? 'active' : ''}`} onClick={(e) => handleNavClick(e, last3DRoute)}>
            art
            <NavUnderline active={isActive(last3DRoute)} />
          </a>
        </div>
      </div>
    </nav>
  )
}

export default Navigation
