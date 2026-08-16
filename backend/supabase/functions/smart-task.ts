function getAgeGuidance(ageBand) {
  return {
    'Early learner · ages 5–7': 'Use 5–10 minute playful activities, concrete examples, simple vocabulary, visual or audio cues, one idea at a time, and no career-pressure language. Require parent or guardian involvement for account and safety decisions.',
    'Young learner · ages 8–12': 'Use 10–15 minute guided activities, concrete examples, short explanations, visual checks for understanding, and age-appropriate projects. Avoid requesting personal information and keep adult oversight available.',
    'Teen learner · ages 13–17': 'Use 15–25 minute structured activities, clear explanations, relatable real-world examples, increasing independence, and age-appropriate project context without assuming adult employment responsibilities.',
    'Adult learner · ages 18+': 'Use adult-appropriate technical depth, professional examples, longer practice blocks when suitable, and career-oriented outcomes.',
    'Prefer not to say': 'Use a balanced beginner-friendly pace and do not infer or reveal an age.'
  }[ageBand] || 'Use a balanced beginner-friendly pace and do not infer or reveal an age.'
}

function fallbackRoadmap(assessment) {
  const targetSkill = assessment?.targetSkill || 'Digital skills'
  const pace = assessment?.availability || 'your available weekly time'
  const ageBand = assessment?.ageBand || 'unspecified'
  const ageGuidance = getAgeGuidance(ageBand)
  return {
    skillLevels: { foundation: 5, practice: 0, projects: 0, communication: 0 },
    phases: [
      { number: 1, title: `${targetSkill} foundations`, weeks: 'Weeks 1-4', topics: `Core concepts · Essential vocabulary · Guided examples · Safe practice · Knowledge checks · First reflection` },
      { number: 2, title: 'Build practical confidence', weeks: 'Weeks 5-8', topics: `Tools and workflows · Worked exercises · Common patterns · Debugging habits · Deliberate practice · Feedback loops` },
      { number: 3, title: 'Create verified evidence', weeks: 'Weeks 9-12', topics: `Project brief · Planning and research · Build or analyse · Explain decisions · Improve quality · Publish evidence` },
      { number: 4, title: 'Portfolio and career preparation', weeks: 'Weeks 13-16', topics: `Portfolio story · Project walkthrough · Communication practice · Interview foundations · Application readiness · Next milestone` },
    ],
    estimatedTimeline: `A paced starting roadmap for ${targetSkill}, designed around ${pace} and a learner-appropriate format. Your personalised phases can be refined as you complete more practice and projects.`,
    learnerStage: ageBand,
  }
}

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
    const targetSkill = assessment?.targetSkill || 'Digital skills'
    const ageGuidance = getAgeGuidance(assessment?.ageBand || 'unspecified')
    let usedFallback = false
    const apiKeys = [Deno.env.get('GEMINI_API_KEY'), Deno.env.get('GEMINI_API_KEY_2')].filter(Boolean)

    if (apiKeys.length === 0) {
      usedFallback = true
      return new Response(JSON.stringify({ roadmap: fallbackRoadmap(assessment), fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const masterCurriculum = `You are an expert digital-skills curriculum designer, mentor, project supervisor, and career coach. Build a beginner-friendly, practical, interactive, project-based roadmap for the learner's chosen skill. Never assume the learner is studying data analysis unless that is their selected skill. Respect the learner's stated experience, goal, available time, device, and learner age band. Explain concepts simply, include deliberate practice, and always end with an age-appropriate evidence milestone. Do not ask for or infer sensitive personal information. For learners under 13, keep activities child-safe, avoid direct requests for contact, location, school, or family details, and assume parent or guardian oversight. Adapt the roadmap using this learner-stage guidance: ${ageGuidance}`

    const prompt = `${masterCurriculum}

## YOUR CURRENT TASK: Generate a personalized learning roadmap

Assessment answers from this specific learner:
${JSON.stringify(assessment, null, 2)}

Based on the curriculum scope above and this learner's specific background, goals, experience, available time, device, and chosen skill (${targetSkill}), design their personalized phased roadmap. If their target industry has a relevant specialization (e.g. Healthcare), include it as its own phase. Always end with a Portfolio & Job Preparation phase.

Each phase's "topics" field must contain 6 to 10 short, distinct, bite-sized topics separated by ' · ', each phrased as a concise lesson title (3-6 words) suitable as one individual mini-lesson someone could complete in 10-15 minutes.

For skillLevels, you MUST base each number on what the learner actually stated in their assessment above — never default everything to 0. Map their answers honestly using this scale:
- "No experience at all" → 0 to 5
- Basic / a little experience → 15 to 35
- Comfortable / intermediate → 40 to 60
- Advanced / experienced → 65 to 85
For skills not directly asked about (like Power BI or Data Viz), estimate reasonably based on their overall background, coding experience, and goals.

    For age-aware delivery, make each topic small enough for the learner stage, use the learner's selected device, and avoid adult employment claims for children. Include a learnerStage field equal to the supplied age band label.

Return ONLY valid JSON (no markdown, no backticks, no explanation) in this exact structure:
{
  "skillLevels": { "excel": "<0-100, based on their stated Excel experience>", "sql": "<0-100, based on their stated SQL experience>", "python": "<0-100, based on their stated coding experience>", "statistics": "<0-100, estimate from background>", "powerBI": "<0-100, estimate>", "dataViz": "<0-100, estimate>" },
  "phases": [{ "number": 1, "title": "string", "weeks": "Weeks 1-3", "topics": "topic one · topic two" }],
  "estimatedTimeline": "one sentence summary",
  "learnerStage": "the supplied age band label"
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
      usedFallback = true
      return new Response(JSON.stringify({ roadmap: fallbackRoadmap(assessment), fallback: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const cleanJson = text.replace(/```json|```/g, '').trim()
    let roadmap
    try {
      roadmap = JSON.parse(cleanJson)
    } catch {
      const objectStart = cleanJson.indexOf('{')
      const objectEnd = cleanJson.lastIndexOf('}')
      if (objectStart >= 0 && objectEnd > objectStart) {
        try { roadmap = JSON.parse(cleanJson.slice(objectStart, objectEnd + 1)) } catch { roadmap = null }
      }
      if (!roadmap) {
        usedFallback = true
        roadmap = fallbackRoadmap(assessment)
      }
    }

    return new Response(JSON.stringify({ roadmap, fallback: usedFallback }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
