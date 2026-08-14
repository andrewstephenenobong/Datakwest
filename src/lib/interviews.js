import { supabase } from './supabase'

export async function getInterviewWorkspace(interviewType = null) {
  const { data, error } = await supabase.rpc('get_interview_workspace', {
    p_interview_type: interviewType,
  })
  return { workspace: data, error }
}

export async function startInterviewSession(templateId) {
  const { data, error } = await supabase.rpc('start_interview_session', {
    p_template_id: templateId,
  })
  return { session: data, error }
}

export async function submitInterviewResponse(sessionId, promptIndex, response, durationSeconds = null) {
  const { data, error } = await supabase.rpc('submit_interview_response', {
    p_session_id: sessionId,
    p_prompt_index: promptIndex,
    p_response: response,
    p_duration_seconds: durationSeconds,
  })
  return { result: data, error }
}

export async function submitInterviewSession(sessionId) {
  const { data, error } = await supabase.rpc('submit_interview_session', {
    p_session_id: sessionId,
  })
  return { result: data, error }
}
