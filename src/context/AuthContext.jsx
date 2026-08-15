import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const AUTH_INIT_TIMEOUT_MS = 5000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let timeoutId

    const finishInitialization = (session) => {
      if (!active) return
      window.clearTimeout(timeoutId)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    const initializeSession = async () => {
      try {
        const result = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => {
            timeoutId = window.setTimeout(() => reject(new Error('auth_init_timeout')), AUTH_INIT_TIMEOUT_MS)
          }),
        ])
        finishInitialization(result?.data?.session ?? null)
      } catch {
        // Public routes must remain usable even when Auth or Supabase is slow/unavailable.
        finishInitialization(null)
      }
    }

    initializeSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    })

    return () => {
      active = false
      window.clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// This module intentionally exports a hook alongside its provider for the existing app API.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
