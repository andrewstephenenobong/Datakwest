import { supabase } from './supabase'

export async function getMarketplace(limit = 20) {
  const { data, error } = await supabase.rpc('get_marketplace', { p_limit: limit })
  return { marketplace: data || { opportunities: [], generated_at: null }, error }
}

export async function getMyApplications(limit = 20) {
  const { data, error } = await supabase.rpc('get_my_applications', { p_limit: limit })
  return { applications: data || { applications: [] }, error }
}

export async function applyToOpportunity(opportunityId, evidence = {}) {
  const { data, error } = await supabase.rpc('apply_to_opportunity', { p_opportunity_id: opportunityId, p_evidence: evidence })
  return { application: data, error }
}

export async function withdrawApplication(applicationId) {
  const { data, error } = await supabase.rpc('withdraw_application', { p_application_id: applicationId })
  return { application: data, error }
}
