import { supabase } from './supabase'

export async function getLearnerAchievements() {
  const { data, error } = await supabase.rpc('get_learner_achievements')
  return { achievements: data || null, error }
}
