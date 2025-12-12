import { useState, useEffect } from 'react'

/*
The Pattern: Hooks Are Just Functions That...

Use other React hooks (useState, useEffect, etc.)

Return reusable logic (state + functions to update it)

Start with "use" (naming convention)


Think of hooks as recipes:
useState = basic ingredient
useEffect = cooking instruction
Your custom hook = complete recipe you can reuse anywhere!
Try using one of these in a component and you'll see how they make your code cleaner! 🎣

/**
 * Example Hook #1: useWindowSize
 * Tracks the browser window size and updates when it changes
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  })

  useEffect(() => {
    // Handler to update size when window resizes
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // Add event listener
    window.addEventListener('resize', handleResize)

    // Cleanup: remove event listener when component unmounts
    return () => window.removeEventListener('resize', handleResize)
  }, []) // Empty array = only run once on mount

  return windowSize
}

/**
 * Example Hook #2: useLocalStorage
 * Stores and retrieves data from localStorage with state management
 */
export function useLocalStorage<T>(key: string, initialValue: T) {
  // Get initial value from localStorage or use provided default
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.error(error)
      return initialValue
    }
  })

  // Update localStorage whenever value changes
  const setValue = (value: T) => {
    try {
      setStoredValue(value)
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error(error)
    }
  }

  return [storedValue, setValue] as const
}

/**
 * Example Hook #3: useToggle
 * Simple toggle hook for boolean states (like modals, dropdowns, etc.)
 */
export function useToggle(initialValue: boolean = false) {
  const [value, setValue] = useState(initialValue)

  const toggle = () => setValue(prev => !prev)
  const setTrue = () => setValue(true)
  const setFalse = () => setValue(false)

  return {
    value,
    toggle,
    setTrue,
    setFalse,
    setValue
  }
}

/**
 * Example Hook #4: useFetch
 * Fetches data from an API with loading and error states
 */
export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch(url)
        if (!response.ok) throw new Error('Network response was not ok')
        const result = await response.json()
        setData(result)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [url]) // Re-fetch if URL changes

  return { data, loading, error }
}

/**
 * HOW TO USE THESE HOOKS IN COMPONENTS:
 *
 * // Example 1: Window Size
 * function MyComponent() {
 *   const { width, height } = useWindowSize()
 *   return <div>Window is {width}x{height}</div>
 * }
 *
 * // Example 2: Local Storage
 * function MyComponent() {
 *   const [name, setName] = useLocalStorage('userName', 'Guest')
 *   return <input value={name} onChange={(e) => setName(e.target.value)} />
 * }
 *
 * // Example 3: Toggle
 * function MyComponent() {
 *   const modal = useToggle(false)
 *   return (
 *     <>
 *       <button onClick={modal.toggle}>Toggle Modal</button>
 *       {modal.value && <Modal onClose={modal.setFalse} />}
 *     </>
 *   )
 * }
 *
 * // Example 4: Fetch
 * function MyComponent() {
 *   const { data, loading, error } = useFetch<User[]>('/api/users')
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *   return <div>{data?.map(user => <div key={user.id}>{user.name}</div>)}</div>
 * }
 */