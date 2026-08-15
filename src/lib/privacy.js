import { supabase } from './supabase'

export async function getPrivacyPreferences() {
  const { data, error } = await supabase.rpc('get_privacy_preferences')
  return { preferences: data || null, error }
}

export async function updatePrivacyPreferences({ personalizationConsent, aiMemoryConsent, analyticsConsent }) {
  const { data, error } = await supabase.rpc('update_privacy_preferences', {
    p_personalization_consent: Boolean(personalizationConsent),
    p_ai_memory_consent: Boolean(aiMemoryConsent),
    p_analytics_consent: Boolean(analyticsConsent),
  })
  return { preferences: data || null, error }
}

export async function requestPrivacyAction(requestType) {
  const { data, error } = await supabase.rpc('request_privacy_action', { p_request_type: requestType })
  return { request: data || null, error }
}
