import { supabase } from './supabase'
import { syncLegacyProjectEvidence } from './learningIntelligence'

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

  if (error || !data?.submission_id) return { submission: data || null, error, evidence: null, evidenceError: null }

  try {
    const evidence = await syncLegacyProjectEvidence(data.submission_id)
    return { submission: data, error: null, evidence, evidenceError: null }
  } catch (evidenceError) {
    console.error('Project evidence sync failed:', evidenceError)
    return { submission: data, error: null, evidence: null, evidenceError }
  }
}
