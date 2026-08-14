import { supabase } from './supabase'

const emptySession = { session_id: null, mode: null, item_limit: 0, items: [] }

export async function startPracticeSession({ skillId = null, mode = 'adaptive', itemLimit = 5, difficulty = null } = {}) {
  const { data, error } = await supabase.rpc('start_practice_session', {
    p_skill_id: skillId,
    p_mode: mode,
    p_item_limit: itemLimit,
    p_difficulty: difficulty,
  })
  return { session: data || emptySession, error }
}

export async function submitPracticeAnswer({ sessionId, practiceItemId, answer, durationSeconds = null }) {
  const { data, error } = await supabase.rpc('submit_practice_answer', {
    p_session_id: sessionId,
    p_practice_item_id: practiceItemId,
    p_answer: answer,
    p_duration_seconds: durationSeconds,
  })
  return { result: data, error }
}

export async function getPracticeHistory(limit = 20) {
  const { data, error } = await supabase.rpc('get_practice_history', { p_limit: limit })
  return { history: data?.history || [], error }
}
