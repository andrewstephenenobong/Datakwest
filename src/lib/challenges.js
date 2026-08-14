import { supabase } from './supabase'

export async function getChallengeCenter() {
  const { data, error } = await supabase.rpc('get_challenge_center')
  return { center: data || { challenges: [], generated_at: null }, error }
}
