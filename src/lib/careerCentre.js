import { supabase } from './supabase'

export async function getCareerCentre() {
  const { data, error } = await supabase.rpc('get_career_centre')
  return { centre: data || null, error }
}
