import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rubricKeys = ['communication', 'technical_reasoning', 'structure', 'evidence', 'role_fit']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { createClient } = await import('jsr:@supabase/supabase-js@2')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const authHeader = req.headers.get('Authorization')
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authHeader) {
      return new Response(JSON.stringify({ error: 'Evaluator configuration or authentication is missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    const { data: authData } = await userClient.auth.getUser()
    const userId = authData?.user?.id
    if (!userId) return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const { sessionId } = await req.json()
    if (!sessionId) return new Response(JSON.stringify({ error: 'sessionId is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: session, error: sessionError } = await adminClient.from('interview_sessions').select('id,user_id,status,locale,template_id').eq('id', sessionId).eq('user_id', userId).maybeSingle()
    if (sessionError || !session) return new Response(JSON.stringify({ error: 'Interview session not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!['submitted', 'evaluating', 'completed'].includes(session.status)) return new Response(JSON.stringify({ error: 'Interview must be submitted before evaluation' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const [{ data: template }, { data: responses }] = await Promise.all([
      adminClient.from('interview_templates').select('title,interview_type,rubric,prompts,version').eq('id', session.template_id).maybeSingle(),
      adminClient.from('interview_responses').select('prompt_index,prompt_snapshot,response,duration_seconds').eq('session_id', sessionId).order('prompt_index', { ascending: true }),
    ])
    if (!template || !responses?.length) return new Response(JSON.stringify({ error: 'Interview evidence is incomplete' }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'Evaluator AI is not configured' }), { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const locale = session.locale || 'en'
    const prompt = `You are Datakwest's controlled interview evaluator. Evaluate the submitted interview evidence against the versioned rubric. Return ONLY valid JSON, with all learner-facing feedback written in locale ${locale}.

Interview title: ${template.title}
Interview type: ${template.interview_type}
Rubric version: ${template.version}
Rubric definition: ${JSON.stringify(template.rubric || {})}
Responses: ${JSON.stringify(responses)}

Use these dimensions, each scored 0-100: ${rubricKeys.join(', ')}.
Do not reward length alone. Judge clarity, correctness, reasoning, structure, evidence, and role fit. Do not make claims about employment outcomes.

Exact JSON shape:
{"total_score":0,"rubric_scores":{"communication":0,"technical_reasoning":0,"structure":0,"evidence":0,"role_fit":0},"feedback":{"summary":"","communication":"","technical_reasoning":"","structure":"","evidence":"","role_fit":""},"strengths":[""],"improvements":[""]}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { response_mime_type: 'application/json' } })
    })
    const data = await response.json()
    if (!response.ok || !data.candidates?.[0]?.content?.parts?.[0]?.text) return new Response(JSON.stringify({ error: 'Evaluator AI did not return a result' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    const result = JSON.parse(data.candidates[0].content.parts[0].text.replace(/```json|```/g, '').trim())
    const scores = Object.fromEntries(rubricKeys.map((key) => [key, Math.max(0, Math.min(100, Number(result.rubric_scores?.[key]) || 0))]))
    const totalScore = Math.round(rubricKeys.reduce((sum, key) => sum + scores[key], 0) / rubricKeys.length)

    const { data: saved, error: saveError } = await adminClient.rpc('evaluate_interview_session_system', {
      p_session_id: sessionId,
      p_locale: locale,
      p_total_score: totalScore,
      p_rubric_scores: scores,
      p_feedback: result.feedback || {},
      p_strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 5) : [],
      p_improvements: Array.isArray(result.improvements) ? result.improvements.slice(0, 5) : [],
      p_evaluation_version: template.version || 1,
    })
    if (saveError) return new Response(JSON.stringify({ error: saveError.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    return new Response(JSON.stringify(saved), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Evaluator failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
