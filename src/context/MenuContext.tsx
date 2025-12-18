import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'


//Tracks whether the mobile menu is open/closed (isMenuOpen)

//Provides a setter to toggle the menu (setIsMenuOpen)

//Handles side effects (prevents body scroll when menu is open)

/*

// Step 1: Create
const ThemeContext = createContext()

// Step 2: Wrap
<ThemeProvider>
  <App />
</ThemeProvider>

// Step 3: Use (either way works)
const theme = useContext(ThemeContext)  // Direct
// OR
const theme = useTheme()  // Custom hook (cleaner)

*/

interface MenuContextType {
  isMenuOpen: boolean
  setIsMenuOpen: (isOpen: boolean) => void
  isMobile: boolean
}

const MenuContext = createContext<MenuContextType | undefined>(undefined)

export function MenuProvider({ children }: { children: ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Track mobile/desktop state
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false // SSR safety
    return window.matchMedia('(max-width: 768px)').matches
  })

  // Listen for viewport changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 768px)')

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hid den'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  return (
    //"Broadcast tower"
    <MenuContext.Provider value={{ isMenuOpen, setIsMenuOpen, isMobile }}>
      {children}
    </MenuContext.Provider>
  )
}

export function useMenu() {
  const context = useContext(MenuContext)
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider')
  }
  return context
}
