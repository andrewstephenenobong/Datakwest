import { supabase } from './supabase'

export async function getReadinessScore() {
  const { data, error } = await supabase.rpc('get_readiness_score')
  return { readiness: data || null, error }
}
