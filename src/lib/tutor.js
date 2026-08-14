import { supabase } from './supabase'

export async function sendTutorMessage({ message, mode = 'tutor', conversationId = null }) {
  const { data, error } = await supabase.functions.invoke('tutor-chat', {
    body: { message, mode, conversationId },
  })

  return { response: data || null, error }
}
