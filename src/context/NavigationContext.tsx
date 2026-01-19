import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface NavigationContextType {
  last3DRoute: string
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined)

const LIGHTWEIGHT_ROUTES = ['/', '/home', '/projects', '/links', '/rydmboat', '/iiifviewer']

export function NavigationProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [last3DRoute, setLast3DRoute] = useState('/the_hill')

  // Track the last 3D route
  useEffect(() => {
    const isLightweight = LIGHTWEIGHT_ROUTES.includes(location.pathname)
    if (!isLightweight) {
      setLast3DRoute(location.pathname)
    }
  }, [location.pathname])

  return (
    <NavigationContext.Provider value={{ last3DRoute }}>
      {children}
    </NavigationContext.Provider>
  )
}

export function useNavigation() {
  const context = useContext(NavigationContext)
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  return context
}
