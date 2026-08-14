import { supabase } from './supabase'

export async function getPublishedProject(projectId) {
  let query = supabase
    .from('projects')
    .select('id, title, brief, rubric, status')
    .eq('status', 'published')
    .limit(1)

  if (projectId) query = query.eq('id', projectId)

  const { data, error } = await query.maybeSingle()
  return { project: data || null, error }
}

export async function submitProjectEvidence(projectId, evidence, reflection) {
  const { data, error } = await supabase.rpc('submit_project_evidence', {
    p_project_id: projectId,
    p_evidence: evidence,
    p_reflection: reflection,
  })

  return { submission: data || null, error }
}
