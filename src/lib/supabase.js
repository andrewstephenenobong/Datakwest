import { createClient } from '@supabase/supabase-js'

const configuredUrl = import.meta.env.VITE_SUPABASE_URL
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Public pages must still render when a developer has not created .env.local.
// Auth/data actions will fail gracefully until real Supabase values are provided.
export const supabaseConfigured = Boolean(configuredUrl && configuredAnonKey)
const supabaseUrl = configuredUrl || 'https://datakwest-local-placeholder.supabase.co'
const supabaseAnonKey = configuredAnonKey || 'datakwest-local-development-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
