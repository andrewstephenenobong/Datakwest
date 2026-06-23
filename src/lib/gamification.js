import { supabase } from './supabase'

export async function checkInStreak(userId, currentStreak, lastActiveDate) {
  const today = new Date().toISOString().split('T')[0]

  if (lastActiveDate === today) {
    return { streak: currentStreak || 0, last_active_date: today }
  }

  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().split('T')[0]

  const newStreak = lastActiveDate === yesterday ? (currentStreak || 0) + 1 : 1

  const { error } = await supabase
    .from('profiles')
    .update({ streak: newStreak, last_active_date: today })
    .eq('id', userId)

  if (error) {
    console.error('Streak update error:', error)
    return { streak: currentStreak || 0, last_active_date: lastActiveDate }
  }

  return { streak: newStreak, last_active_date: today }
}

export async function awardXp(userId, currentXp, amount) {
  const newXp = (currentXp || 0) + amount

  const { error } = await supabase
    .from('profiles')
    .update({ xp: newXp })
    .eq('id', userId)

  if (error) {
    console.error('XP update error:', error)
    return currentXp || 0
  }

  return newXp
}
export function getDisplayStreak(storedStreak, lastActiveDate) {
  const today = new Date().toISOString().split('T')[0]
  const yesterdayDate = new Date()
  yesterdayDate.setDate(yesterdayDate.getDate() - 1)
  const yesterday = yesterdayDate.toISOString().split('T')[0]

  const isActiveToday = lastActiveDate === today
  const isAtRisk = lastActiveDate === yesterday
  const isBroken = !isActiveToday && !isAtRisk

  const displayStreak = isBroken ? 0 : (storedStreak || 0)

  return { displayStreak, isActiveToday }
}