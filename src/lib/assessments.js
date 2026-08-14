import { supabase } from './supabase'

export async function getAssessmentCenter() {
  const { data, error } = await supabase.rpc('get_assessment_center')
  return { center: data || { history: [], available: [] }, error }
}
