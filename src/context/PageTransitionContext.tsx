import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface PageTransitionContextType {
  isActive: boolean
  triggerTransition: (targetRoute: string) => void
  isTransitioning: boolean
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined)

export const PageTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isActive, setIsActive] = useState<boolean>(false)
  const navigate = useNavigate()
  const location = useLocation()
  const timeoutRef = useRef<number | null>(null)

  const triggerTransition = useCallback((targetRoute: string) => {
    // If we're already on the target route, don't trigger transition
    if (location.pathname === targetRoute) {
      return
    }

    // Clear any pending timeouts to allow interruption
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Navigate immediately to new route
    navigate(targetRoute)

    // Set active state
    setIsActive(true)

    // Wait for animation to complete
    timeoutRef.current = window.setTimeout(() => {
      setIsActive(false)
      timeoutRef.current = null
    }, 500) // Animation duration
  }, [navigate, location.pathname])

  return (
    <PageTransitionContext.Provider
      value={{
        isActive,
        triggerTransition,
        isTransitioning: timeoutRef.current !== null,
      }}
    >
      {children}
    </PageTransitionContext.Provider>
  )
}

export const usePageTransition = () => {
  const context = useContext(PageTransitionContext)
  if (!context) {
    throw new Error('usePageTransition must be used within PageTransitionProvider')
  }
  return context
}
