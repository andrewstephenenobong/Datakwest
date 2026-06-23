import { supabase } from './supabase'

export async function logEvent(userId, eventType, metadata = {}) {
  try {
    await supabase.from('events').insert({ user_id: userId, event_type: eventType, metadata })
  } catch (err) {
    console.error('Analytics log error:', err)
  }
}
