import { supabase } from './supabase'

export async function getMyPortfolio(userId) {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, status, evidence, reflection, submitted_at, created_at, project:projects(title, brief)')
    .eq('user_id', userId)
    .order('submitted_at', { ascending: false, nullsFirst: false })

  return { submissions: data || [], error }
}
