import { supabase } from './supabase'

export async function getTodaysMission(userId) {
  if (!userId) return { mission: null, error: null }

  const { data, error } = await supabase
    .from('missions')
    .select('id, mission_date, mission_type, payload, status, completed_at')
    .eq('user_id', userId)
    .eq('mission_date', new Date().toISOString().slice(0, 10))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return { mission: data || null, error }
}

export async function completeDailyMission(missionId) {
  if (!missionId) {
    return { result: null, error: new Error('A mission id is required.') }
  }

  const { data, error } = await supabase.rpc('complete_daily_mission', {
    p_mission_id: missionId,
  })

  return { result: data || null, error }
}
