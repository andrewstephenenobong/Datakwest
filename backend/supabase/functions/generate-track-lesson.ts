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

    // DEBUG — remove after diagnosis
    console.log('AUTH HEADER PRESENT:', !!authHeader)
    console.log('AUTH HEADER PREFIX:', authHeader?.substring(0, 20))

    const { createClient } = await import('jsr:@supabase/supabase-js@2')

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    const { data: authData } = await supabaseClient.auth.getUser()
    const userId = authData?.user?.id

    console.log('USER ID:', userId)

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { skill, phaseNumber, lessonIndex, topic, phaseTitle } = await req.json()
    const cacheKey = `${phaseNumber}-${lessonIndex}`

    const serviceUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SERVICE_ROLE_KEY')
    const serviceClient = createClient(serviceUrl, serviceKey)

    const { data: track, error: trackError } = await serviceClient
      .from('skill_tracks')
      .select('*')
      .eq('skill', skill)
      .maybeSingle()

    if (trackError || !track) {
      console.log('TRACK ERROR:', trackError)
      return new Response(JSON.stringify({ error: 'Skill track not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (track.lesson_cache && track.lesson_cache[cacheKey]) {
      console.log('CACHE HIT:', cacheKey)
      return new Response(JSON.stringify({ content: track.lesson_cache[cacheKey], fromCache: true }), {
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

    const apiKeys = [Deno.env.get('GEMINI_API_KEY'), Deno.env.get('GEMINI_API_KEY_2')].filter(Boolean)

    if (apiKeys.length === 0) {
      return new Response(JSON.stringify({ error: 'No GEMINI_API_KEY secrets found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const prompt = `You are an elite Data Analysis instructor and mentor. Your teaching style is beginner-friendly, practical, interactive, and professional-level. Assume the learner knows nothing beyond what is stated below, and never skip prerequisites.

For this lesson you must:
1. Explain the concept simply first, then add technical depth
2. Give one real-world example from an industry context
3. Give one short practical exercise the learner can try immediately
4. Test mastery with 10 to 15 multiple choice questions covering different angles and difficulty levels

This is ONE bite-sized micro-lesson. Keep the explanation focused and do not overwhelm. This lesson is part of a standalone, non-personalized "${skill}: Beginner to Advanced" track — write for a general motivated beginner, not any specific learner's background.

Phase: ${phaseTitle}
Lesson topic: ${topic}

Format your explanation clearly using this structure:
- Use short paragraphs (2-3 sentences each)
- Start simple, then gradually add technical depth
- Use plain language throughout
- Structure the content with clear logical flow: definition → how it works → why it matters

Additionally, create a visual diagram to accompany this lesson when it would genuinely help understanding. Choose ONE of:
- "flow": a sequential process with 3 to 5 steps
- "comparison": 2 to 4 items being contrasted side by side
- "none": skip the diagram if this topic doesn't naturally fit a flow or comparison structure

IMPORTANT — Hands-on practice task: Include a "practiceTask" if this lesson topic is specifically about writing SQL queries, writing Python code, or writing Excel formulas/using Excel features. Determine which:

- If this lesson is about writing SQL queries: set "practiceType" to "sql". Give a small realistic table schema with sample rows, and a concrete task.
- If this lesson's skill is "python", default to creating a hands-on coding practiceTask. Set "practiceType" to "python". Use pandas only if this lesson's phase has already taught pandas; otherwise stick to plain Python.
- If this lesson's skill is "excel" and involves an actionable formula/function/feature: default to creating a hands-on practiceTask. Set "practiceType" to "excel". Describe a small spreadsheet layout, give sample cell values, and a concrete formula/steps task.
- Otherwise, set "practiceTask" to null entirely.

In all cases, "expectedOutcome" should clearly describe what a correct solution should achieve — used for grading, never shown to the learner. The task must be small enough for a beginner to complete in 3 to 7 minutes.

This lesson also belongs to exactly one of these skill categories: excel, sql, python, statistics, powerBI, dataViz, or none.

Return ONLY valid JSON (no markdown, no backticks, no extra text) in this exact structure:
{
  "skill": "one of: excel, sql, python, statistics, powerBI, dataViz, none",
  "explanation": "well-structured explanation using short paragraphs separated by newlines.",
  "keyPoints": ["point 1", "point 2", "point 3", "point 4", "point 5"],
  "example": "one detailed, concrete, real-world industry example illustrating the concept",
  "exercise": "one short, practical hands-on exercise the learner can do right now",
  "diagram": {
    "type": "flow",
    "title": "short diagram title",
    "items": [{ "label": "short label", "description": "optional one-line detail" }]
  },
  "practiceTask": {
    "practiceType": "sql",
    "schemaDescription": "appropriate description for the practiceType",
    "sampleRows": "small sample data appropriate to the practiceType",
    "task": "the specific task to solve",
    "expectedOutcome": "a clear description of what a correct solution should return or do"
  },
  "checkQuestions": [
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 0 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 1 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 2 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 0 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 3 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 1 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 2 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 0 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 3 },
    { "question": "question text", "options": ["A", "B", "C", "D"], "correctIndex": 1 }
  ]
}

If diagram type is "none", set "title" to an empty string and "items" to an empty array.

Rules for checkQuestions: include exactly 10 to 15 questions, basic recall progressing to applied/analytical, each testing a different aspect, plausible wrong answers, varied correctIndex positions, last 3 slightly harder.`

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
        console.log(`TRACK LESSON RESPONSE (key ${apiKeys.indexOf(apiKey) + 1}, attempt ${attempts}):`, JSON.stringify(data).substring(0, 200))

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
    const content = JSON.parse(cleanJson)

    const { data: freshTrack } = await serviceClient
      .from('skill_tracks')
      .select('lesson_cache')
      .eq('skill', skill)
      .maybeSingle()

    const updatedCache = { ...(freshTrack?.lesson_cache || {}), [cacheKey]: content }

    await serviceClient
      .from('skill_tracks')
      .update({ lesson_cache: updatedCache })
      .eq('skill', skill)

    console.log('LESSON CACHED:', cacheKey)

    return new Response(JSON.stringify({ content, fromCache: false }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.log('FUNCTION ERROR:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
