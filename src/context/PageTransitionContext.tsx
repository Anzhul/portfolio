import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

type TransitionState = 'idle' | 'exiting' | 'entering'

interface PageTransitionContextType {
  transitionState: TransitionState
  triggerTransition: (targetRoute: string) => void
  isTransitioning: boolean
}

const PageTransitionContext = createContext<PageTransitionContextType | undefined>(undefined)

export const PageTransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transitionState, setTransitionState] = useState<TransitionState>('idle')
  const navigate = useNavigate()
  const timeoutRef = useRef<number | null>(null)

  const triggerTransition = useCallback((targetRoute: string) => {
    // Clear any pending timeouts to allow interruption
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Start exit animation
    setTransitionState('exiting')

    // Wait for exit animation to complete
    timeoutRef.current = window.setTimeout(() => {
      // Navigate to new route
      navigate(targetRoute)

      // Start enter animation
      setTransitionState('entering')

      // Wait for enter animation to complete
      timeoutRef.current = window.setTimeout(() => {
        setTransitionState('idle')
        timeoutRef.current = null
      }, 500) // Enter duration
    }, 500) // Exit duration
  }, [navigate])

  return (
    <PageTransitionContext.Provider
      value={{
        transitionState,
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
