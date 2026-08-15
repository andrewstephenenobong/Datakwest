import { createContext, useContext, useEffect, useMemo, useState } from 'react'

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

  useEffect(() => {
    const applyTheme = () => {
      const nextTheme = resolveTheme(preference)
      setResolvedTheme(nextTheme)
      document.documentElement.dataset.theme = nextTheme
      document.documentElement.style.colorScheme = nextTheme
    }
    applyTheme()
    try { localStorage.setItem(STORAGE_KEY, preference) } catch { /* device storage may be unavailable */ }
    const media = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (preference === 'system' && media) {
      media.addEventListener?.('change', applyTheme)
      return () => media.removeEventListener?.('change', applyTheme)
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
