import { supabase } from './supabase'

export async function getTrackProgress(userId, skill) {
  const { data, error } = await supabase
    .from('user_track_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('skill', skill)
    .maybeSingle()

  if (error) {
    console.error('Track progress fetch error:', error)
    return null
  }
  return data
}

export async function ensureTrackProgress(userId, skill) {
  const existing = await getTrackProgress(userId, skill)
  if (existing) return existing

  const { data, error } = await supabase
    .from('user_track_progress')
    .upsert({
      user_id: userId,
      skill,
      lesson_state: {},
      phase_state: {}
    }, { onConflict: 'user_id,skill' })
    .select()
    .single()

  if (error) {
    console.error('Track progress init error:', error)
    return null
  }
  return data
}

export async function updateLessonState(userId, skill, lessonKey, updates) {
  const current = await getTrackProgress(userId, skill)
  const lessonState = { ...(current?.lesson_state || {}) }
  lessonState[lessonKey] = { ...(lessonState[lessonKey] || {}), ...updates }

  const { data, error } = await supabase
    .from('user_track_progress')
    .upsert({
      user_id: userId,
      skill,
      lesson_state: lessonState,
      phase_state: current?.phase_state || {}
    }, { onConflict: 'user_id,skill' })
    .select()
    .single()

  if (error) {
    console.error('Track lesson state update error:', error)
    return null
  }
  return data
}
