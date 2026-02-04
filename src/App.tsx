import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { lazy, Suspense, useState, useEffect } from 'react'
import './App.scss'
import { Home } from './pages/lightweight/Home'
import { Projects } from './pages/lightweight/Projects'
import { Links } from './pages/lightweight/Links'
import { RydmBoat } from './pages/lightweight/rydmboat/RydmBoat'
import { IIIFViewer } from './pages/lightweight/iiifviewer/IIIFViewer'
import { Syrte } from './pages/lightweight/syrte/Syrte'
import { ArcadeShip } from './pages/lightweight/arcade_ship/ArcadeShip'
import Navigation from './components/UI/navigation/Navigation'
import Toolbar from './components/UI/toolbar/Toolbar'
import { Footer } from './components/UI/footer/Footer'
import { ViewportProvider } from './context/ViewportContext'
import { ToolbarProvider } from './context/ToolbarContext'
import { NavigationProvider } from './context/NavigationContext'
import { PageTransitionProvider } from './context/PageTransitionContext'

// Lazy load the heavy 3D experience - only loads when user navigates to 3D routes
const Experience3D = lazy(() =>
  import('./pages/experience/Experience3D').then(module => ({
    default: module.Experience3D
  }))
)

// Lightweight page routes that don't use 3D
const LIGHTWEIGHT_ROUTES = ['/', '/home', '/projects', '/links', '/rydmboat', '/iiifviewer', '/syrte', '/arcade_ship']

// Configuration for persistent pages
const PERSISTENT_PAGES = [
  { path: '/', component: Home },
  { path: '/projects', component: Projects },
  { path: '/links', component: Links },
  { path: '/rydmboat', component: RydmBoat },
  { path: '/iiifviewer', component: IIIFViewer },
  { path: '/syrte', component: Syrte },
  { path: '/arcade_ship', component: ArcadeShip },
] as const

function AppContent() {
  const location = useLocation()
  const [has3DLoaded, setHas3DLoaded] = useState(false)
  const [visitedPages, setVisitedPages] = useState<Set<string>>(() => new Set())

  // Normalize path (treat /home as /)
  const currentPath = location.pathname === '/home' ? '/' : location.pathname

  // Determine if current route is lightweight or 3D
  const isLightweightRoute = LIGHTWEIGHT_ROUTES.includes(location.pathname)
  const should3DBeActive = !isLightweightRoute

  // Track visited lightweight pages
  useEffect(() => {
    if (isLightweightRoute && currentPath !== '/home') {
      setVisitedPages(prev => {
        if (prev.has(currentPath)) return prev
        const next = new Set(prev)
        next.add(currentPath)
        return next
      })
    }
  }, [currentPath, isLightweightRoute])

  // Once 3D loads, keep track so we can keep it mounted
  useEffect(() => {
    if (should3DBeActive) {
      setHas3DLoaded(true)
    }
  }, [should3DBeActive])

  return (
    <>
      {/* Navigation - shared across all pages */}
      <Navigation />

      {/* Toolbar - loads immediately but only functional in 3D routes */}
      <Toolbar loaded={true} />

      {/* Redirect /home to / */}
      <Routes>
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/*" element={null} />
      </Routes>

      {/* Persistent lightweight pages - stay mounted once visited */}
      <div className="persistent-pages-container">
        {PERSISTENT_PAGES.map(({ path, component: Component }) => {
          const isVisited = visitedPages.has(path)
          const isVisible = currentPath === path

          return (
            <div
              key={path}
              className={`persistent-page ${isVisible ? 'visible' : 'hidden'}`}
            >
              {isVisited && <Component isVisible={isVisible} />}
            </div>
          )
        })}

        {/* Single persistent footer at bottom of all pages (hidden on 3D explore page) */}
        <div className={`footer-wrapper ${isLightweightRoute ? 'visible' : 'hidden'}`}>
          <Footer />
        </div>
      </div>

      {/* Keep Experience3D mounted once loaded, just toggle visibility */}
      {(should3DBeActive || has3DLoaded) && (
        <Suspense fallback={null}>
          <Experience3D isVisible={should3DBeActive} />
        </Suspense>
      )}
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <ViewportProvider>
        <NavigationProvider>
          <PageTransitionProvider>
            <ToolbarProvider>
              <AppContent />
            </ToolbarProvider>
          </PageTransitionProvider>
        </NavigationProvider>
      </ViewportProvider>
    </BrowserRouter>
  )
}

export default App
