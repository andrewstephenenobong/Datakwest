import { supabase } from './supabase'

export async function getMyNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, notification_type, payload, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)

  return { notifications: data || [], error }
}

export async function markNotificationRead(notificationId) {
  const { data, error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  })

  return { result: data || null, error }
}
