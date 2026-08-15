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

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const geminiKey = Deno.env.get('GEMINI_API_KEY')
  const authorization = req.headers.get('Authorization') || ''
  if (!serviceRoleKey || !supabaseUrl || !geminiKey || authorization !== `Bearer ${serviceRoleKey}`) {
    return jsonResponse({ error: 'service_role_required' }, 401)
  }

  try {
    const body = await req.json()
    const sourceDocumentId = typeof body.sourceDocumentId === 'string' ? body.sourceDocumentId : ''
    const limit = Math.min(Math.max(Number(body.limit) || 20, 1), 100)
    if (!sourceDocumentId) return jsonResponse({ error: 'sourceDocumentId_required' }, 400)

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: document, error: documentError } = await adminClient
      .from('source_documents')
      .select('id, title, publication_status, locale')
      .eq('id', sourceDocumentId)
      .maybeSingle()
    if (documentError) return jsonResponse({ error: 'source_document_lookup_failed' }, 500)
    if (!document) return jsonResponse({ error: 'source_document_not_found' }, 404)
    if (document.publication_status !== 'approved') return jsonResponse({ error: 'source_document_not_approved' }, 409)

    const { data: chunks, error: chunkError } = await adminClient
      .from('source_chunks')
      .select('id, content, chunk_index')
      .eq('source_document_id', sourceDocumentId)
      .in('embedding_status', ['pending', 'failed'])
      .order('chunk_index', { ascending: true })
      .limit(limit)
    if (chunkError) return jsonResponse({ error: 'source_chunks_unavailable' }, 500)
    if (!chunks?.length) return jsonResponse({ documentId: sourceDocumentId, processed: 0, remaining: 0, model: 'gemini-embedding-001' })

    const claimIds = chunks.map((chunk) => chunk.id)
    await adminClient.from('source_chunks').update({ embedding_status: 'processing', updated_at: new Date().toISOString() }).in('id', claimIds)

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        requests: chunks.map((chunk) => ({
          model: 'models/gemini-embedding-001',
          content: { parts: [{ text: chunk.content }] },
          taskType: 'RETRIEVAL_DOCUMENT',
          title: document.title,
          outputDimensionality: 768,
        })),
      }),
    })
    if (!response.ok) {
      await adminClient.from('source_chunks').update({ embedding_status: 'failed', updated_at: new Date().toISOString() }).in('id', claimIds)
      return jsonResponse({ error: 'embedding_provider_failed' }, 502)
    }

    const result = await response.json()
    const embeddings = Array.isArray(result.embeddings) ? result.embeddings : []
    let processed = 0
    for (let index = 0; index < chunks.length; index += 1) {
      const values = embeddings[index]?.values
      if (!Array.isArray(values) || values.length !== 768 || values.some((value: unknown) => !Number.isFinite(Number(value)))) continue
      const { error } = await adminClient
        .from('source_chunks')
        .update({
          embedding: `[${values.join(',')}]`,
          embedding_model: 'gemini-embedding-001',
          embedding_version: 1,
          embedding_status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', chunks[index].id)
      if (!error) processed += 1
    }

    const failedIds = chunks.slice(processed).map((chunk) => chunk.id)
    if (failedIds.length) await adminClient.from('source_chunks').update({ embedding_status: 'failed', updated_at: new Date().toISOString() }).in('id', failedIds)
    return jsonResponse({ documentId: sourceDocumentId, processed, failed: failedIds.length, model: 'gemini-embedding-001', dimension: 768 })
  } catch (error) {
    console.error('embed-source-chunks error', error)
    return jsonResponse({ error: 'embedding_worker_failed' }, 500)
  }
})
