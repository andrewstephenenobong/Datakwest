Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const authHeader = req.headers.get('Authorization')

    const { createClient } = await import('jsr:@supabase/supabase-js@2')
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: authData } = await supabaseClient.auth.getUser()
    const userId = authData?.user?.id

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const DAILY_LIMIT = 60
    const today = new Date().toISOString().split('T')[0]

    const { data: usageRow } = await supabaseClient
      .from('ai_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .maybeSingle()

    if (usageRow && usageRow.call_count >= DAILY_LIMIT) {
      return new Response(JSON.stringify({ error: "You've reached today's usage limit. Please try again tomorrow." }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    await supabaseClient.from('ai_usage').upsert({
      user_id: userId,
      usage_date: today,
      call_count: (usageRow?.call_count || 0) + 1
    }, { onConflict: 'user_id,usage_date' })

    const { phaseTitle, topics, background } = await req.json()
    const apiKeys = [Deno.env.get('GEMINI_API_KEY'), Deno.env.get('GEMINI_API_KEY_2')].filter(Boolean)

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY secrets found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `You are an elite Data Analysis tutor giving a focused remediation lesson to a learner who just failed a quiz on specific topics.

Phase: ${phaseTitle}
Topics they got wrong and need to review: ${topics.join(', ')}
Learner background: ${background || 'beginner'}

Write a short, encouraging, focused review covering ONLY these specific weak topics — not the whole phase. Be direct about what likely confused them and re-explain it more clearly, possibly from a different angle than a first-time lesson would.

Return ONLY valid JSON (no markdown, no backticks) in this exact structure:
{
  "intro": "one encouraging sentence acknowledging this is a focused review, not a punishment",
  "topicReviews": [
    { "topic": "topic name", "explanation": "clear, focused re-explanation of just this topic, 2-3 sentences", "tip": "one memorable tip or way to avoid the common mistake" }
  ]
}

Include one entry in topicReviews for each topic listed above.`

    let data
    for (const apiKey of apiKeys) {
      let attempts = 0
      const maxAttempts = 2

      while (attempts < maxAttempts) {
        attempts++
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          }
        )

        data = await response.json()
        console.log(`REMEDIATION RESPONSE (key ${apiKeys.indexOf(apiKey) + 1}, attempt ${attempts}):`, JSON.stringify(data))

        if (data.candidates) break

        const isRetryable = data.error?.status === 'UNAVAILABLE' || data.error?.code === 429
        if (isRetryable && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, attempts * 2000))
          continue
        }
        break
      }

      if (data?.candidates) break
    }

    if (!data?.candidates) {
      return new Response(JSON.stringify({ error: 'Gemini API error on all keys', details: data }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = data.candidates[0].content.parts[0].text
    const cleanJson = text.replace(/```json|```/g, '').trim()
    const remediation = JSON.parse(cleanJson)

    return new Response(JSON.stringify({ remediation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
