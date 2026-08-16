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

    const { phaseTitle, topics, background, learningStyle } = await req.json()
    const { data: learnerPreferences } = await supabaseClient
      .from('learner_preferences')
      .select('age_band, guardian_controlled')
      .eq('learner_id', userId)
      .maybeSingle()
    const ageBand = learnerPreferences?.age_band || '13_plus'
    const ageGuidance = {
      under_6: 'Use very simple vocabulary, one idea per question, concrete everyday examples, and 6 to 8 short questions. Avoid career language and do not request personal information.',
      '6_12': 'Use clear vocabulary, concrete examples, short questions, and 8 to 10 questions. Keep examples age-appropriate and avoid requesting personal information.',
      13_plus: 'Use accessible but increasingly technical language, relatable examples, and 10 to 15 questions.',
      adult: 'Use adult-appropriate technical language, professional examples, and 15 to 20 questions.',
    }[ageBand] || 'Use accessible language, concrete examples, and 10 to 15 questions.'
    const apiKeys = [Deno.env.get('GEMINI_API_KEY'), Deno.env.get('GEMINI_API_KEY_2')].filter(Boolean)

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY secrets found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `You are an expert digital-skills examiner creating an age-appropriate end-of-phase assessment.

Phase: ${phaseTitle}
All topics covered in this phase: ${topics}
Learner background: ${background || 'beginner'}
Preferred learning style: ${learningStyle || 'theory + practice'}
Learner stage: ${ageBand}
Age-aware guidance: ${ageGuidance}

Create an assessment testing mastery across ALL the topics listed above, not just one. Distribute questions proportionally across topics. Progress from basic understanding to applied reasoning at the learner's stage. For learners under 13, use child-safe examples, avoid collecting personal information, and never include adult employment pressure or sensitive scenarios.

Return ONLY valid JSON (no markdown, no backticks) in this exact structure:
{
  "questions": [
    { "question": "question text", "topic": "which topic this tests", "options": ["A", "B", "C", "D"], "correctIndex": 0 }
  ]
}

Include a number of questions appropriate to the learner-stage guidance above, covering every topic listed, with varied correctIndex positions and plausible wrong answers.`

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
        console.log(`PHASE QUIZ GEMINI RESPONSE (key ${apiKeys.indexOf(apiKey) + 1}, attempt ${attempts}):`, JSON.stringify(data))

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
    const quiz = JSON.parse(cleanJson)

    return new Response(JSON.stringify({ quiz }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
