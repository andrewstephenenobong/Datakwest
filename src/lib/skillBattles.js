import { supabase } from './supabase'

export async function getSkillBattleLobby(limit = 20) {
  const { data, error } = await supabase.rpc('get_skill_battle_lobby', { p_limit: limit })
  return { lobby: data || { battles: [], generated_at: null }, error }
}

export async function startSkillBattle(challengeId, skillId = null, itemLimit = 5, difficulty = null) {
  const { data, error } = await supabase.rpc('start_skill_battle', {
    p_challenge_id: challengeId,
    p_skill_id: skillId,
    p_item_limit: itemLimit,
    p_difficulty: difficulty,
  })
  return { session: data, error }
}

export async function submitBattleAnswer(sessionId, practiceItemId, answer, durationSeconds = null) {
  const { data, error } = await supabase.rpc('submit_practice_answer', {
    p_session_id: sessionId,
    p_practice_item_id: practiceItemId,
    p_answer: answer,
    p_duration_seconds: durationSeconds,
  })
  return { result: data, error }
}

export async function getSkillBattleLeaderboard(challengeId, limit = 20) {
  const { data, error } = await supabase.rpc('get_skill_battle_leaderboard', { p_challenge_id: challengeId, p_limit: limit })
  return { leaderboard: data || { challenge_id: challengeId, leaderboard: [] }, error }
}
