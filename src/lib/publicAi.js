import { supabase } from './supabase'

const TOKEN_KEY = 'datakwest_public_ai_preview_token'

function getVisitorToken() {
  if (typeof window === 'undefined') return ''
  const existing = window.localStorage.getItem(TOKEN_KEY)
  if (existing) return existing
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`
  window.localStorage.setItem(TOKEN_KEY, token)
  return token
}

export async function askPublicAi({ message, history = [], selectedPath = 'digital skills' }) {
  const { data, error } = await supabase.functions.invoke('public-ai-preview', {
    body: { message, history, selectedPath, visitorToken: getVisitorToken() },
  })
  return { response: data, error }
}
