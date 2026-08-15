import { createClient } from 'jsr:@supabase/supabase-js@2'

const allowedOrigin = Deno.env.get('APP_ORIGIN') || 'https://datakwest.vercel.app'
const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  Vary: 'Origin',
}
const MODEL_ID = 'gemini-2.5-flash'
const PROMPT_VERSION = 'universal-skill-discovery-v1'
const MAX_SKILL_LENGTH = 160

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function normalizeSlug(value: string) {
  return value.toLowerCase().trim().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100) || 'learner-selected-skill'
}

function safeString(value: unknown, max = 500) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function parseJsonObject(raw: string) {
  const clean = raw.replace(/```json|```/g, '').trim()
  try { return JSON.parse(clean) } catch {
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start >= 0 && end > start) {
      try { return JSON.parse(clean.slice(start, end + 1)) } catch { return null }
    }
    return null
  }
}

function normalizeGeneratedGraph(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const source = raw as Record<string, unknown>
  const competencies = Array.isArray(source.competencies) ? source.competencies : []
  const normalized = competencies.slice(0, 24).map((item, index) => {
    const value = item && typeof item === 'object' ? item as Record<string, unknown> : {}
    const key = normalizeSlug(safeString(value.key) || `competency-${index + 1}`)
    const nodeType = ['concept', 'capability', 'prerequisite', 'practice', 'project', 'assessment', 'career_outcome'].includes(safeString(value.node_type)) ? safeString(value.node_type) : index === competencies.length - 1 ? 'assessment' : 'capability'
    const prerequisites = Array.isArray(value.prerequisites) ? value.prerequisites.map((item) => normalizeSlug(safeString(item))).filter(Boolean).slice(0, 6) : []
    return {
      key,
      node_type: nodeType,
      title: safeString(value.title, 180) || `Core competency ${index + 1}`,
      description: safeString(value.description, 700),
      level: Math.min(Math.max(Number(value.level) || 1, 1), 10),
      order_index: Number(value.order_index) || (index + 1) * 10,
      mastery_threshold: Math.min(Math.max(Number(value.mastery_threshold) || 0.8, 0.5), 0.95),
      prerequisites,
    }
  })
  const unique = Array.from(new Map(normalized.map((item) => [item.key, item])).values())
  return {
    normalized_skill: safeString(source.normalized_skill, 160),
    canonical_slug: normalizeSlug(safeString(source.canonical_slug) || safeString(source.normalized_skill)),
    domain: safeString(source.domain, 120),
    summary: safeString(source.summary, 1000),
    target_outcomes: Array.isArray(source.target_outcomes) ? source.target_outcomes.map((item) => safeString(item, 300)).filter(Boolean).slice(0, 8) : [],
    estimated_hours_min: Math.max(Number(source.estimated_hours_min) || 20, 1),
    estimated_hours_max: Math.max(Number(source.estimated_hours_max) || 80, Number(source.estimated_hours_min) || 20),
    source_queries: Array.isArray(source.source_queries) ? source.source_queries.map((item) => safeString(item, 240)).filter(Boolean).slice(0, 8) : [],
    competencies: unique,
  }
}

function fallbackGraph(request: Record<string, unknown>) {
  const subject = safeString(request.requested_skill, MAX_SKILL_LENGTH) || 'your selected skill'
  const slug = normalizeSlug(subject)
  const make = (key: string, node_type: string, title: string, description: string, level: number, order_index: number, prerequisites: string[] = []) => ({ key, node_type, title, description, level, order_index, mastery_threshold: 0.8, prerequisites })
  return {
    normalized_skill: subject,
    canonical_slug: slug,
    domain: 'learner-selected subject',
    summary: `A provisional beginner pathway for ${subject}, starting with orientation, foundations, guided practice, and a small applied project.`,
    target_outcomes: [`Explain the foundations of ${subject}`, `Complete a guided beginner task in ${subject}`, `Create a small artefact that demonstrates the first capability`],
    estimated_hours_min: 20,
    estimated_hours_max: 80,
    source_queries: [`${subject} beginner fundamentals official guide`, `${subject} core concepts professional body`, `${subject} beginner practical project`],
    competencies: [
      make('orientation', 'concept', `${subject} orientation`, `Understand what ${subject} is, where it is used, and the major areas beginners encounter.`, 1, 10),
      make('foundations', 'capability', `${subject} foundations`, `Learn the essential vocabulary, principles, tools, and safety considerations for ${subject}.`, 1, 20, ['orientation']),
      make('guided-practice', 'practice', `Guided ${subject} practice`, `Follow a small worked example and practise the core steps with feedback.`, 2, 30, ['foundations']),
      make('applied-project', 'project', `Beginner ${subject} project`, `Create a small practical artefact that applies the foundations to a realistic goal.`, 3, 40, ['guided-practice']),
      make('reflection', 'practice', `${subject} explanation`, `Explain the choices made in the project and identify what still needs practice.`, 3, 50, ['applied-project']),
      make('verified-capability', 'assessment', `Verified ${subject} capability`, `Demonstrate the first capability without step-by-step support and respond to feedback.`, 4, 60, ['reflection']),
    ],
  }
}

async function generateGraph(request: Record<string, unknown>, apiKey: string) {
  const prompt = `You are the Universal Skill Architect for Datakwest. Generate a safe, coherent provisional learning graph for a learner-selected subject.

Requested subject: ${safeString(request.requested_skill, MAX_SKILL_LENGTH)}
Learner goal: ${safeString(request.goal, 1000)}
Current level: ${safeString(request.current_level, 40) || 'beginner'}
Weekly minutes: ${String(request.weekly_minutes || 'unknown')}
Locale: ${safeString(request.locale, 20) || 'en'}

Design rules:
- Create a general-purpose foundation before specializations.
- Use 4 to 12 ordered competencies. Include concepts, practice, an applied project or assessment, and a career outcome when appropriate.
- Keep prerequisites acyclic and reference only competency keys in the same response.
- Do not claim certification, employment, guaranteed outcomes, or factual authority.
- Do not invent citations. Return source search queries that a governed source-ingestion workflow can review later.
- This is a provisional graph, not an authoritative published course.

Return only JSON matching the schema.`
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 12000)
  let response: Response
  try {
    response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL_ID}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            normalized_skill: { type: 'STRING' }, canonical_slug: { type: 'STRING' }, domain: { type: 'STRING' }, summary: { type: 'STRING' },
            target_outcomes: { type: 'ARRAY', items: { type: 'STRING' } }, estimated_hours_min: { type: 'NUMBER' }, estimated_hours_max: { type: 'NUMBER' },
            source_queries: { type: 'ARRAY', items: { type: 'STRING' } },
            competencies: { type: 'ARRAY', items: { type: 'OBJECT', properties: { key: { type: 'STRING' }, node_type: { type: 'STRING' }, title: { type: 'STRING' }, description: { type: 'STRING' }, level: { type: 'INTEGER' }, order_index: { type: 'INTEGER' }, mastery_threshold: { type: 'NUMBER' }, prerequisites: { type: 'ARRAY', items: { type: 'STRING' } } }, required: ['key', 'node_type', 'title', 'description', 'level', 'order_index', 'mastery_threshold', 'prerequisites'] } },
          },
          required: ['normalized_skill', 'canonical_slug', 'domain', 'summary', 'target_outcomes', 'estimated_hours_min', 'estimated_hours_max', 'source_queries', 'competencies'],
        },
        temperature: 0.2,
      },
      }),
      signal: controller.signal,
    })
  } catch {
    clearTimeout(timeout)
    return { graph: fallbackGraph(request), usage: {}, generationMode: 'provisional_fallback' }
  }
  clearTimeout(timeout)
  if (!response.ok) return { graph: fallbackGraph(request), usage: {}, generationMode: 'provisional_fallback' }
  const data = await response.json()
  const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text
  const graph = normalizeGeneratedGraph(rawText ? parseJsonObject(rawText) : null)
  if (!graph || graph.competencies.length < 4) return { graph: fallbackGraph(request), usage: data.usageMetadata || {}, generationMode: 'provisional_fallback' }
  return { graph, usage: data.usageMetadata || {}, generationMode: 'gemini' }
}

Deno.serve(async (req) => {
  let requestId = ''
  let stage = 'start'
  let adminClient: ReturnType<typeof createClient> | null = null
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    const authHeader = req.headers.get('Authorization')
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !apiKey || !authHeader) return jsonResponse({ error: 'not_authenticated' }, 401)
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
    adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: authData } = await userClient.auth.getUser()
    const userId = authData.user?.id
    if (!userId) return jsonResponse({ error: 'not_authenticated' }, 401)
    const body = await req.json()
    requestId = typeof body.requestId === 'string' ? body.requestId : ''
    if (!requestId) {
      const created = await userClient.rpc('create_universal_skill_request', {
        p_requested_skill: safeString(body.requestedSkill, MAX_SKILL_LENGTH), p_goal: safeString(body.goal, 1000), p_current_level: safeString(body.currentLevel, 40) || 'beginner',
        p_weekly_minutes: body.weeklyMinutes ? Number(body.weeklyMinutes) : null, p_locale: safeString(body.locale, 20) || 'en', p_target_age_min: body.targetAgeMin ? Number(body.targetAgeMin) : null, p_target_age_max: body.targetAgeMax ? Number(body.targetAgeMax) : null,
      })
      if (created.error || !created.data) return jsonResponse({ error: 'skill_request_invalid' }, 400)
      requestId = created.data.id
    }
    stage = 'load_request'
    const { data: request, error: requestError } = await adminClient.from('universal_skill_requests').select('*').eq('id', requestId).eq('learner_id', userId).maybeSingle()
    if (requestError || !request) return jsonResponse({ error: 'skill_request_not_found' }, 404)
    stage = 'resolve_existing_skill'
    await adminClient.from('universal_skill_requests').update({ status: 'resolving', updated_at: new Date().toISOString() }).eq('id', requestId)
    const normalizedRequested = normalizeSlug(request.requested_skill)
    const { data: existingSkills } = await adminClient.from('skills').select('id, slug, title, description, canonical_slug, status').eq('status', 'published').limit(100)
    const exactExisting = (existingSkills || []).find((skill) => normalizeSlug(skill.title) === normalizedRequested || normalizeSlug(skill.slug) === normalizedRequested || normalizeSlug(skill.canonical_slug || '') === normalizedRequested)
    const existing = exactExisting || (existingSkills || []).find((skill) => [skill.title, skill.slug, skill.canonical_slug].filter(Boolean).some((value) => normalizeSlug(String(value)).includes(normalizedRequested) || normalizedRequested.includes(normalizeSlug(String(value)))))
    if (existing) {
      const { data: version } = await adminClient.from('skill_graph_versions').select('id').eq('skill_id', existing.id).eq('locale', request.locale).eq('status', 'published').order('version_no', { ascending: false }).limit(1).maybeSingle()
      await adminClient.from('universal_skill_requests').update({ normalized_skill: existing.title, canonical_slug: existing.canonical_slug || existing.slug, status: version?.id ? 'published' : 'review', skill_id: existing.id, skill_graph_version_id: version?.id || null, confidence: 1, updated_at: new Date().toISOString() }).eq('id', requestId)
      return jsonResponse({ requestId, resolution: 'existing', skill: existing, skillGraphVersionId: version?.id || null, status: version?.id ? 'published' : 'review' })
    }
    stage = 'start_generation'
    await adminClient.from('universal_skill_requests').update({ status: 'generating', updated_at: new Date().toISOString() }).eq('id', requestId)
    const runNumberResult = await adminClient.from('universal_skill_generation_runs').select('run_no').eq('request_id', requestId).order('run_no', { ascending: false }).limit(1).maybeSingle()
    const runNo = (runNumberResult.data?.run_no || 0) + 1
    const started = await adminClient.from('universal_skill_generation_runs').insert({ request_id: requestId, run_no: runNo, status: 'started', model_id: MODEL_ID, prompt_version: PROMPT_VERSION, input_snapshot: { requested_skill: request.requested_skill, goal: request.goal, current_level: request.current_level, weekly_minutes: request.weekly_minutes, locale: request.locale } }).select('id').single()
    stage = 'generate_graph'
    const generated = await generateGraph(request, apiKey)
    if ('error' in generated) {
      await adminClient.from('universal_skill_generation_runs').update({ status: 'failed', error_code: generated.error }).eq('id', started.data?.id)
      await adminClient.from('universal_skill_requests').update({ status: 'failed', failure_code: generated.error, updated_at: new Date().toISOString() }).eq('id', requestId)
      return jsonResponse({ error: generated.error, requestId }, 502)
    }
    const graph = generated.graph
    const generationMode = generated.generationMode || 'gemini'
    stage = 'insert_skill'
    const { data: universalPath } = await adminClient.from('career_paths').select('id').eq('slug', 'universal-discovery').single()
    const skillInsert = await adminClient.from('skills').insert({ career_path_id: universalPath?.id, slug: `discovered-${graph.canonical_slug}`, title: graph.normalized_skill || request.requested_skill, description: graph.summary, level: 'foundation', status: 'draft', rubric_version: 1, canonical_slug: `discovered:${graph.canonical_slug}`, discovery_source: 'ai_discovered', metadata: { target_outcomes: graph.target_outcomes, source_queries: graph.source_queries, domain: graph.domain } }).select('id').single()
    if (skillInsert.error || !skillInsert.data) throw new Error(skillInsert.error?.code || 'skill_insert_failed')
        stage = 'insert_graph_version'
    const versionInsert = await adminClient.from('skill_graph_versions').insert({
 skill_id: skillInsert.data.id, version_no: 1, locale: request.locale, status: 'draft', estimated_hours_min: graph.estimated_hours_min, estimated_hours_max: graph.estimated_hours_max, methodology: 'AI-discovered provisional graph; requires source grounding and validation before pilot or publication.' }).select('id').single()
    if (versionInsert.error || !versionInsert.data) throw new Error('graph_version_insert_failed')
        stage = 'insert_graph_nodes'
    const nodeRows = graph.competencies.map((node) => ({
 skill_graph_version_id: versionInsert.data.id, node_key: node.key, node_type: node.node_type, title: node.title, description: node.description, level: node.level, order_index: node.order_index, mastery_threshold: node.mastery_threshold, metadata: { generated_by: MODEL_ID, prerequisites: node.prerequisites } }))
    const nodeInsert = await adminClient.from('skill_graph_nodes').insert(nodeRows).select('id, node_key, order_index')
    if (nodeInsert.error || !nodeInsert.data || nodeInsert.data.length < 4) throw new Error('graph_nodes_insert_failed')
    const nodeByKey = new Map(nodeInsert.data.map((node) => [node.node_key, node]))
    const edgePairs = new Set<string>()
    const edgeRows: Record<string, unknown>[] = []
    graph.competencies.forEach((node) => {
      const target = nodeByKey.get(node.key)
      const prereqs = node.prerequisites.filter((key) => nodeByKey.has(key))
      prereqs.forEach((key) => { const from = nodeByKey.get(key); const identity = `${from.id}:${target.id}`; if (!edgePairs.has(identity)) { edgePairs.add(identity); edgeRows.push({ skill_graph_version_id: versionInsert.data.id, from_node_id: from.id, to_node_id: target.id, edge_type: 'prerequisite', strength: 1 }) } })
    })
    const ordered = [...nodeInsert.data].sort((a, b) => a.order_index - b.order_index)
    for (let i = 1; i < ordered.length; i += 1) { const identity = `${ordered[i - 1].id}:${ordered[i].id}`; if (!edgePairs.has(identity)) { edgePairs.add(identity); edgeRows.push({ skill_graph_version_id: versionInsert.data.id, from_node_id: ordered[i - 1].id, to_node_id: ordered[i].id, edge_type: 'prerequisite', strength: 0.8 }) } }
    stage = 'insert_graph_edges'
    if (edgeRows.length) await adminClient.from('skill_graph_edges').insert(edgeRows)
    stage = 'validate_graph'
    const validation = await adminClient.rpc('validate_universal_skill_graph', { p_skill_graph_version_id: versionInsert.data.id })
    const validationReport = validation.data || { valid: false, reason: validation.error?.message || 'validation_failed' }
    const status = validationReport.valid ? 'review' : 'failed'
    validationReport.generation_mode = generationMode
    if (generationMode === 'provisional_fallback') validationReport.review_required = true
    await adminClient.from('universal_skill_generation_runs').update({ status: validationReport.valid ? 'completed' : 'rejected', output_snapshot: graph, validation_report: validationReport, input_tokens: Number(generated.usage.promptTokenCount) || null, output_tokens: Number(generated.usage.candidatesTokenCount) || null }).eq('id', started.data?.id)
    await adminClient.from('universal_skill_requests').update({ normalized_skill: graph.normalized_skill || request.requested_skill, canonical_slug: graph.canonical_slug, status, skill_id: skillInsert.data.id, skill_graph_version_id: versionInsert.data.id, confidence: validationReport.valid ? 0.75 : 0.2, failure_code: validationReport.valid ? null : 'graph_validation_failed', metadata: { validation: validationReport, source_queries: graph.source_queries }, updated_at: new Date().toISOString() }).eq('id', requestId)
    return jsonResponse({ requestId, resolution: 'discovered', status, generationMode, skill: { id: skillInsert.data.id, title: graph.normalized_skill || request.requested_skill, description: graph.summary, canonicalSlug: graph.canonical_slug }, skillGraphVersionId: versionInsert.data.id, validation: validationReport, competencies: graph.competencies.map(({ prerequisites, ...node }) => node), sourceQueries: graph.source_queries })
  } catch (error) {
    const errorCode = error instanceof Error ? error.message.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) : 'unknown'
    console.error('universal-skill-discovery error', { stage, requestId, error: errorCode })
    if (requestId) await adminClient?.from('universal_skill_requests').update({ status: 'failed', failure_code: `stage_${stage}_${errorCode}`, updated_at: new Date().toISOString() }).eq('id', requestId)
    return jsonResponse({ error: 'universal_skill_discovery_failed' }, 500)
  }
})
