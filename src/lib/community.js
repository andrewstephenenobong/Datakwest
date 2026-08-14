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
