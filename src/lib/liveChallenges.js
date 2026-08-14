import { supabase } from './supabase'

export async function getLiveChallengeWorkspace(challengeId) {
  const { data, error } = await supabase.rpc('get_live_challenge_workspace', { p_challenge_id: challengeId })
  return { workspace: data || { challenge: null, rounds: [] }, error }
}

export async function startLiveChallengeRound(roundId) {
  const { data, error } = await supabase.rpc('start_live_challenge_round', { p_round_id: roundId })
  return { session: data, error }
}

export async function submitLiveChallengeRound(sessionId, response) {
  const { data, error } = await supabase.rpc('submit_live_challenge_round', { p_session_id: sessionId, p_response: response })
  return { result: data, error }
}

export async function getLiveChallengeLeaderboard(challengeId, limit = 20) {
  const { data, error } = await supabase.rpc('get_live_challenge_leaderboard', { p_challenge_id: challengeId, p_limit: limit })
  return { leaderboard: data || { challenge_id: challengeId, leaderboard: [] }, error }
}

export async function reportLiveChallengeScore(submissionId, reason) {
  const { data, error } = await supabase.rpc('report_live_challenge_score', { p_submission_id: submissionId, p_reason: reason })
  return { dispute: data, error }
}
