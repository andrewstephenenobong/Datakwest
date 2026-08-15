import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://datakwest.vercel.app',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = req.headers.get('Authorization') || ''
  const accessToken = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !accessToken) {
    return jsonResponse({ error: 'not_configured_or_authenticated' }, 401)
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser(accessToken)
    if (userError || !userData.user) return jsonResponse({ error: 'invalid_session' }, 401)

    const { data: permitted, error: permissionError } = await userClient.rpc('has_admin_permission', {
      p_permission: 'learning:embed',
    })
    if (permissionError || permitted !== true) return jsonResponse({ error: 'admin_permission_required' }, 403)

    const body = await req.json()
    const sourceDocumentId = typeof body.sourceDocumentId === 'string' ? body.sourceDocumentId : ''
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100)
    if (!sourceDocumentId) return jsonResponse({ error: 'sourceDocumentId_required' }, 400)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const requestId = req.headers.get('x-request-id') || crypto.randomUUID()
    await adminClient.from('admin_audit_log').insert({
      actor_id: userData.user.id,
      action: 'learning_embedding_requested',
      target_type: 'source_document',
      target_id: sourceDocumentId,
      reason: 'Authorized platform operator started governed source embedding ingestion',
      after_state: { source_document_id: sourceDocumentId, limit, request_id: requestId },
      request_id: requestId,
      correlation_id: requestId,
    })

    const workerResponse = await fetch(`${supabaseUrl}/functions/v1/embed-source-chunks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'x-request-id': requestId,
      },
      body: JSON.stringify({ sourceDocumentId, limit }),
    })
    const workerBody = await workerResponse.json().catch(() => ({}))
    if (!workerResponse.ok) {
      return jsonResponse({ error: 'embedding_worker_failed', worker: workerBody, requestId }, 502)
    }
    return jsonResponse({ ...workerBody, requestId, authorizedBy: userData.user.id })
  } catch (error) {
    console.error('admin-embed-source-chunks error', error)
    return jsonResponse({ error: 'admin_embedding_trigger_failed' }, 500)
  }
})
