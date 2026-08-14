import { supabase } from './supabase'

export async function getPeerReviewWorkspace(limit = 20) {
  const { data, error } = await supabase.rpc('get_peer_review_workspace', { p_limit: limit })
  return { workspace: data || { inbox: [], outbox: [] }, error }
}

export async function acceptPeerReview(requestId) {
  const { data, error } = await supabase.rpc('accept_peer_review', { p_request_id: requestId })
  return { result: data, error }
}

export async function submitPeerReview(requestId, score, feedback) {
  const { data, error } = await supabase.rpc('submit_peer_review', {
    p_request_id: requestId,
    p_score: score,
    p_feedback: feedback,
  })
  return { result: data, error }
}
