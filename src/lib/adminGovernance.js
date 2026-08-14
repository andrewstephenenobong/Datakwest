import { supabase } from './supabase'

function asError(error) {
  return error ? { message: error.message || 'Request failed', code: error.code || 'unknown' } : null
}

async function callRpc(name, args) {
  const { data, error } = await supabase.rpc(name, args)
  return { data, error: asError(error) }
}

export function createModerationReport(subjectType, subjectId, category, details = '', idempotencyKey = '') {
  return callRpc('create_moderation_report', {
    p_subject_type: subjectType,
    p_subject_id: subjectId,
    p_category: category,
    p_details: details,
    p_idempotency_key: idempotencyKey,
  })
}

export function getModerationQueue(queue = null, status = 'open', limit = 25, before = null) {
  return callRpc('get_moderation_queue', {
    p_queue: queue,
    p_status: status,
    p_limit: limit,
    p_before: before,
  })
}

export function claimModerationCase(caseId) {
  return callRpc('claim_moderation_case', { p_case_id: caseId })
}

export function applyModerationAction(caseId, actionType, reasonCode, rationale, durationMinutes = null) {
  return callRpc('apply_moderation_action', {
    p_case_id: caseId,
    p_action_type: actionType,
    p_reason_code: reasonCode,
    p_rationale: rationale,
    p_duration_minutes: durationMinutes,
  })
}

export function submitModerationAppeal(caseId, grounds) {
  return callRpc('submit_moderation_appeal', { p_case_id: caseId, p_grounds: grounds })
}

export function getAdminAuditEvents(limit = 50, before = null) {
  return callRpc('get_admin_audit_events', { p_limit: limit, p_before: before })
}

export function errorMessage(error) {
  return error?.message || 'Something went wrong. Please try again.'
}
