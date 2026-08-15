import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ThemeContext = createContext(null)
const STORAGE_KEY = 'datakwest-theme'
const VALID_THEMES = new Set(['system', 'light', 'dark'])
const ACCENT_KEY = 'datakwest-accent'
const ACCENT_PALETTES = {
  ocean: { label: 'Ocean', primary: '#2456A6', soft: '#EEF3FA', contrast: '#FFFFFF' },
  mint: { label: 'Mint', primary: '#2D8A5A', soft: '#EEF6F1', contrast: '#FFFFFF' },
  gold: { label: 'Gold', primary: '#967414', soft: '#FFF5D8', contrast: '#0E1B1F' },
  violet: { label: 'Violet', primary: '#6B4FA1', soft: '#F2EDFB', contrast: '#FFFFFF' },
}

function readTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return VALID_THEMES.has(saved) ? saved : 'system'
  } catch {
    return 'system'
  }
}

function readAccent() {
  try {
    const saved = localStorage.getItem(ACCENT_KEY)
    return ACCENT_PALETTES[saved] ? saved : 'ocean'
  } catch {
    return 'ocean'
  }
}

function resolveTheme(preference) {
  if (preference !== 'system') return preference
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(readTheme)
  const [accent, setAccent] = useState(readAccent)
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
      const nextAccent = ACCENT_PALETTES[accent] || ACCENT_PALETTES.ocean
      root.dataset.theme = nextTheme
      root.dataset.accent = accent
      root.style.colorScheme = nextTheme
      root.style.setProperty('--dk-accent', nextAccent.primary)
      root.style.setProperty('--dk-accent-soft', nextAccent.soft)
      root.style.setProperty('--dk-accent-contrast', nextAccent.contrast)
      hasMounted.current = true
    }
    applyTheme()
    try {
      localStorage.setItem(STORAGE_KEY, preference)
      localStorage.setItem(ACCENT_KEY, accent)
    } catch { /* device storage may be unavailable */ }
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
  }, [preference, accent])

  const value = useMemo(() => ({ preference, resolvedTheme, setPreference, accent, accentOptions: ACCENT_PALETTES, setAccent }), [preference, resolvedTheme, accent])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const value = useContext(ThemeContext)
  if (!value) throw new Error('useTheme must be used inside ThemeProvider')
  return value
}
