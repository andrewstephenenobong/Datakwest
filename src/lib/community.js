import { supabase } from './supabase'

export async function getCommunityHub() {
  const { data, error } = await supabase.rpc('get_community_hub')
  return { hub: data || { communities: [], generated_at: null }, error }
}

export async function joinCommunity(communityId) {
  const { data, error } = await supabase.rpc('join_community', { p_community_id: communityId })
  return { membership: data, error }
}

export async function leaveCommunity(communityId) {
  const { data, error } = await supabase.rpc('leave_community', { p_community_id: communityId })
  return { membership: data, error }
}

export async function getCommunityFeed(communityId, limit = 20) {
  const { data, error } = await supabase.rpc('get_community_feed', { p_community_id: communityId, p_limit: limit })
  return { feed: data || { community_id: communityId, posts: [] }, error }
}

export async function createCommunityPost(communityId, body) {
  const { data, error } = await supabase.rpc('create_community_post', { p_community_id: communityId, p_body: body })
  return { post: data, error }
}

export async function reportCommunityPost(postId, reason, details = '') {
  const { data, error } = await supabase.rpc('create_moderation_report', {
    p_subject_type: 'post',
    p_subject_id: postId,
    p_category: reason,
    p_details: details,
    p_idempotency_key: `community-post:${postId}:${reason}`,
  })
  return { report: data, error }
}
