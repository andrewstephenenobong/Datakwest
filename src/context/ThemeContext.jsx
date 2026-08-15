import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'datakwest-theme'
const VALID_THEMES = new Set(['system', 'light', 'dark'])

function readTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return VALID_THEMES.has(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

function resolveTheme(preference) {
  if (preference !== 'system') return preference
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readTheme)
  const [resolvedTheme, setResolvedTheme] = useState(() => resolveTheme(readTheme()))
  const hasMounted = useRef(false)

  useEffect(() => {
    const applyTheme = () => {
      const nextTheme = resolveTheme(preference)
      const root = document.documentElement
      if (hasMounted.current) {
        root.classList.add('theme-transition')
        window.setTimeout(() => root.classList.remove('theme-transition'), 240)
      }
      setResolvedTheme(nextTheme)
      root.dataset.theme = nextTheme
      root.style.colorScheme = nextTheme
      hasMounted.current = true
    }
    applyTheme()
    try { localStorage.setItem(STORAGE_KEY, preference) } catch { /* device storage may be unavailable */ }
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (preference === 'system' && media) {
      if (media.addEventListener) {
        media.addEventListener('change', applyTheme)
        return () => media.removeEventListener('change', applyTheme)
      }
      media.addListener?.(applyTheme)
      return () => media.removeListener?.(applyTheme)
    }
    return undefined
  }, [preference])

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference }), [preference, resolvedTheme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
