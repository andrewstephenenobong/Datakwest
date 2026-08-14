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

    const { assessment } = await req.json()
    const apiKeys = [Deno.env.get('GEMINI_API_KEY'), Deno.env.get('GEMINI_API_KEY_2')].filter(Boolean)

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY secrets found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const masterCurriculum = `You are an elite Data Analysis instructor, curriculum designer, mentor, project supervisor, and career coach. Your mission is to take learners from COMPLETE BEGINNER to PROFESSIONAL DATA ANALYST. Assume they know nothing, and teach every concept in the correct order, never skipping prerequisites. Your teaching style is beginner-friendly, practical, interactive, project-based, industry-standard, and professional-level.

The full curriculum scope you can draw from includes: Data Fundamentals, Excel (beginner to advanced), SQL, Statistics, Python for Data Analysis (NumPy, Pandas, Matplotlib, Seaborn, Plotly), Data Visualization, Power BI, Advanced Analytics, industry specializations when relevant (e.g. Healthcare Analytics), Real Business Analysis across industries, Portfolio Building, and Job Preparation.

For every topic you ever teach: explain simply, explain technically, give a real-world example, give an exercise, and test understanding with a quiz. Never move the learner on until they demonstrate mastery.`

    const prompt = `${masterCurriculum}

## YOUR CURRENT TASK: Generate a personalized learning roadmap

Assessment answers from this specific learner:
${JSON.stringify(assessment, null, 2)}

Based on the curriculum scope above and this learner's specific background, goals, experience, available time, and target industry, design their personalized phased roadmap. If their target industry has a relevant specialization (e.g. Healthcare), include it as its own phase. Always end with a Portfolio & Job Preparation phase.

Each phase's "topics" field must contain 6 to 10 short, distinct, bite-sized topics separated by ' · ', each phrased as a concise lesson title (3-6 words) suitable as one individual mini-lesson someone could complete in 10-15 minutes.

For skillLevels, you MUST base each number on what the learner actually stated in their assessment above — never default everything to 0. Map their answers honestly using this scale:
- "No experience at all" → 0 to 5
- Basic / a little experience → 15 to 35
- Comfortable / intermediate → 40 to 60
- Advanced / experienced → 65 to 85
For skills not directly asked about (like Power BI or Data Viz), estimate reasonably based on their overall background, coding experience, and goals.

Return ONLY valid JSON (no markdown, no backticks, no explanation) in this exact structure:
{
  "skillLevels": { "excel": "<0-100, based on their stated Excel experience>", "sql": "<0-100, based on their stated SQL experience>", "python": "<0-100, based on their stated coding experience>", "statistics": "<0-100, estimate from background>", "powerBI": "<0-100, estimate>", "dataViz": "<0-100, estimate>" },
  "phases": [{ "number": 1, "title": "string", "weeks": "Weeks 1-3", "topics": "topic one · topic two" }],
  "estimatedTimeline": "one sentence summary"
}

All skillLevels values must be actual numbers in the final JSON (not strings, not placeholder text) — the quoted placeholders above just describe what to calculate. Customize the number of phases (3 to 7), titles, and topics based on this learner's specific situation.`

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
        console.log(`GEMINI RESPONSE (key ${apiKeys.indexOf(apiKey) + 1}, attempt ${attempts}):`, JSON.stringify(data))

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
    const roadmap = JSON.parse(cleanJson)

    return new Response(JSON.stringify({ roadmap }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
