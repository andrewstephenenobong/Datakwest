import { createClient } from 'jsr:@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('APP_ORIGIN') || 'https://datakwest.vercel.app'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin',
}

const MAX_MESSAGE_LENGTH = 4000
const DAILY_LIMIT = 60

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const authHeader = req.headers.get('Authorization')
    if (!supabaseUrl || !supabaseAnonKey || !authHeader) return jsonResponse({ error: 'not_authenticated' }, 401)

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: authData } = await supabase.auth.getUser()
    const userId = authData.user?.id
    if (!userId) return jsonResponse({ error: 'not_authenticated' }, 401)

    const body = await req.json()
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const mode = typeof body.mode === 'string' ? body.mode : 'tutor'
    const conversationId = typeof body.conversationId === 'string' ? body.conversationId : null
    if (!message || message.length > MAX_MESSAGE_LENGTH) return jsonResponse({ error: 'message_invalid' }, 400)
    if (!['tutor', 'mentor', 'practice', 'interview', 'career_coach', 'project_reviewer'].includes(mode)) return jsonResponse({ error: 'mode_invalid' }, 400)

    const today = new Date().toISOString().slice(0, 10)
    const { data: usageRow } = await supabase
      .from('ai_usage')
      .select('call_count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle()

    if ((usageRow?.call_count || 0) >= DAILY_LIMIT) return jsonResponse({ error: 'daily_limit_reached' }, 429)

    const { error: usageError } = await supabase.from('ai_usage').upsert({
      user_id: userId,
      usage_date: today,
      call_count: (usageRow?.call_count || 0) + 1,
    }, { onConflict: 'user_id,usage_date' })
    if (usageError) return jsonResponse({ error: 'usage_tracking_failed' }, 503)

    let activeConversationId = conversationId
    if (!activeConversationId) {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({ user_id: userId, mode, title: message.slice(0, 80) })
        .select('id')
        .single()
      if (conversationError) return jsonResponse({ error: 'conversation_create_failed' }, 500)
      activeConversationId = conversation.id
    }

    const { error: userMessageError } = await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      user_id: userId,
      role: 'user',
      content: { text: message },
      safety_state: 'safe',
    })
    if (userMessageError) return jsonResponse({ error: 'message_create_failed' }, 500)

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return jsonResponse({ error: 'ai_provider_unavailable' }, 503)

    const prompt = `You are DataKwest Tutor, a patient career-learning coach. Help the learner make progress without doing graded work for them. Explain concepts simply, ask one useful follow-up question when needed, connect advice to practical data-analysis skills, and keep responses under 350 words. Never claim to have reviewed evidence you cannot access.\n\nMode: ${mode}\nLearner message: ${message}`
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
    if (!response.ok) return jsonResponse({ error: 'ai_provider_error' }, 502)

    const providerData = await response.json()
    const reply = providerData.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    if (!reply) return jsonResponse({ error: 'ai_empty_response' }, 502)

    const { error: assistantMessageError } = await supabase.from('messages').insert({
      conversation_id: activeConversationId,
      user_id: userId,
      role: 'assistant',
      content: { text: reply },
      model_id: 'gemini-2.5-flash',
      prompt_version: 'tutor-v1',
      safety_state: 'safe',
    })
    if (assistantMessageError) return jsonResponse({ error: 'assistant_message_create_failed' }, 500)

    return jsonResponse({ conversationId: activeConversationId, reply, model: 'gemini-2.5-flash' })
  } catch {
    return jsonResponse({ error: 'unexpected_error' }, 500)
  }
})
