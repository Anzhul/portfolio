import { createContext, useContext, useState, type ReactNode } from 'react'

interface ToolbarContextType {
  onNavigatePrev?: () => void
  onNavigateNext?: () => void
  onToggleMap?: () => void
  isMapVisible?: boolean
  is3DActive?: boolean
  setToolbarHandlers: (handlers: {
    onNavigatePrev?: () => void
    onNavigateNext?: () => void
    onToggleMap?: () => void
    isMapVisible?: boolean
  }) => void
}

const ToolbarContext = createContext<ToolbarContextType>({
  setToolbarHandlers: () => {}
})

export function useToolbar() {
  return useContext(ToolbarContext)
}

interface ToolbarProviderProps {
  children: ReactNode
}

export function ToolbarProvider({ children }: ToolbarProviderProps) {
  const [handlers, setHandlers] = useState<{
    onNavigatePrev?: () => void
    onNavigateNext?: () => void
    onToggleMap?: () => void
    isMapVisible?: boolean
  }>({})

  const setToolbarHandlers = (newHandlers: typeof handlers) => {
    setHandlers(newHandlers)
  }

  // 3D experience is active if any handlers are set
  const is3DActive = !!(handlers.onNavigatePrev || handlers.onNavigateNext || handlers.onToggleMap)

  return (
    <ToolbarContext.Provider value={{ ...handlers, setToolbarHandlers, is3DActive }}>
      {children}
    </ToolbarContext.Provider>
  )
}
