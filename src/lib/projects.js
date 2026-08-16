import { supabase } from './supabase'
import { syncLegacyProjectEvidence } from './learningIntelligence'

export async function getPublishedProject(projectId = null) {
  const { data, error } = await supabase.rpc('get_published_project', {
    p_project_id: projectId,
  })
  return { project: data && data.id ? data : null, error }
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
