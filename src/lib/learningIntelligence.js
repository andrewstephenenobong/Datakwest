import { supabase } from './supabase'

async function callLearningRpc(name, args = {}) {
  const { data, error } = await supabase.rpc(name, args)
  if (error) throw error
  return data
}

export function createSkillEnrolment({ skillId, skillGraphVersionId = null, locale = 'en', weeklyMinutes = null, targetOutcome = '', startingLevel = 'beginner' }) {
  return callLearningRpc('create_skill_enrolment', {
    p_skill_id: skillId,
    p_skill_graph_version_id: skillGraphVersionId,
    p_locale: locale,
    p_weekly_minutes: weeklyMinutes,
    p_target_outcome: targetOutcome,
    p_starting_level: startingLevel,
  })
}

export function setActiveSkillEnrolment(enrolmentId) {
  return callLearningRpc('set_active_skill_enrolment', { p_enrolment_id: enrolmentId })
}

export async function getLearnerSkillEnrolments() {
  const [{ data, error }, { data: preference, error: preferenceError }] = await Promise.all([
    supabase
      .from('learner_skill_enrolments')
      .select('id, skill_id, skill_graph_version_id, status, target_outcome, weekly_minutes, starting_level, updated_at, skills(id, slug, title, description)')
      .eq('status', 'active')
      .order('updated_at', { ascending: false }),
    supabase
      .from('learner_preferences')
      .select('active_skill_enrolment_id')
      .maybeSingle(),
  ])
  if (error) throw error
  if (preferenceError) throw preferenceError
  return (data ?? []).map((enrolment) => ({
    ...enrolment,
    is_active: Boolean(preference?.active_skill_enrolment_id && enrolment.id === preference.active_skill_enrolment_id),
  }))
}

export function startLearningEvidence(learningObjectVersionId) {
  return callLearningRpc('start_learning_evidence', {
    p_learning_object_version_id: learningObjectVersionId,
  })
}

export function submitLearningEvidence(evidenceId, response, artifactManifest = {}) {
  return callLearningRpc('submit_learning_evidence', {
    p_evidence_id: evidenceId,
    p_response: response,
    p_artifact_manifest: artifactManifest,
  })
}

export function getLearnerSkillState(enrolmentId) {
  return callLearningRpc('get_learner_skill_state', {
    p_enrolment_id: enrolmentId,
  })
}

export function getNextLearningAction(enrolmentId) {
  return callLearningRpc('get_next_learning_action', {
    p_enrolment_id: enrolmentId,
  })
}

export function getShadowModelContract(modelKey = 'mastery_prediction') {
  return callLearningRpc('get_shadow_model_contract', {
    p_model_key: modelKey,
  })
}

export function updateLearnerPreferences({
  locale = 'en',
  timezone = null,
  weeklyMinutes = null,
  preferredModalities = [],
  accessibility = {},
  explanationStyle = null,
  ageBand = '13_plus',
  guardianControlled = false,
} = {}) {
  return callLearningRpc('update_learner_preferences', {
    p_locale: locale,
    p_timezone: timezone,
    p_weekly_minutes: weeklyMinutes,
    p_preferred_modalities: preferredModalities,
    p_accessibility: accessibility,
    p_explanation_style: explanationStyle,
    p_age_band: ageBand,
    p_guardian_controlled: guardianControlled,
  })
}

export function syncLegacyPracticeEvidence(attemptId) {
  return callLearningRpc('sync_legacy_practice_evidence', {
    p_attempt_id: attemptId,
  })
}

export function syncLegacyProjectEvidence(submissionId) {
  return callLearningRpc('sync_legacy_project_evidence', {
    p_submission_id: submissionId,
  })
}

export function recordVersionedLearningEvent({
  eventName,
  eventValue = {},
  sessionId = null,
  skillId = null,
  skillGraphNodeId = null,
  learningObjectVersionId = null,
  eventId = null,
}) {
  return callLearningRpc('record_versioned_learning_event', {
    p_event_name: eventName,
    p_event_value: eventValue,
    p_session_id: sessionId,
    p_skill_id: skillId,
    p_skill_graph_node_id: skillGraphNodeId,
    p_learning_object_version_id: learningObjectVersionId,
    p_event_id: eventId,
  })
}

export function recordLearnerInteraction({
  eventName,
  eventValue = {},
  sessionId = null,
  skillId = null,
  skillGraphNodeId = null,
  learningObjectVersionId = null,
}) {
  return callLearningRpc('record_learner_interaction', {
    p_event_name: eventName,
    p_event_value: eventValue,
    p_session_id: sessionId,
    p_skill_id: skillId,
    p_skill_graph_node_id: skillGraphNodeId,
    p_learning_object_version_id: learningObjectVersionId,
  })
}

export async function getPublishedSkillCatalogue({ locale = 'en', limit = 100 } = {}) {
  const { data, error } = await supabase
    .from('skill_graph_versions')
    .select('id, skill_id, version_no, locale, status, target_age_min, target_age_max, estimated_hours_min, estimated_hours_max, methodology, skills(id, slug, title, description, level, career_path_id)')
    .eq('locale', locale)
    .eq('status', 'published')
    .order('version_no', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}

export async function findPublishedSkillForTarget(targetSkill, { locale = 'en' } = {}) {
  const catalogue = await getPublishedSkillCatalogue({ locale })
  const normalizedTarget = String(targetSkill || '').trim().toLowerCase()
  if (!normalizedTarget) return null

  return catalogue.find((entry) => {
    const skill = entry.skills
    return [skill?.id, skill?.slug, skill?.title].filter(Boolean).some((value) => String(value).trim().toLowerCase() === normalizedTarget)
  }) || catalogue.find((entry) => {
    const skill = entry.skills
    return [skill?.slug, skill?.title].filter(Boolean).some((value) => String(value).trim().toLowerCase().includes(normalizedTarget) || normalizedTarget.includes(String(value).trim().toLowerCase()))
  }) || null
}

export function createUniversalSkillRequest({
  requestedSkill,
  goal = '',
  currentLevel = 'beginner',
  weeklyMinutes = null,
  locale = 'en',
  targetAgeMin = null,
  targetAgeMax = null,
} = {}) {
  return callLearningRpc('create_universal_skill_request', {
    p_requested_skill: requestedSkill,
    p_goal: goal,
    p_current_level: currentLevel,
    p_weekly_minutes: weeklyMinutes,
    p_locale: locale,
    p_target_age_min: targetAgeMin,
    p_target_age_max: targetAgeMax,
  })
}

export function getUniversalSkillRequest(requestId) {
  return callLearningRpc('get_universal_skill_request', { p_request_id: requestId })
}

export async function discoverUniversalSkill(payload) {
  const { data: { session } = {} } = await supabase.auth.getSession()
  const { data, error } = await supabase.functions.invoke('universal-skill-discovery', {
    body: payload,
    headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
  })
  if (error) throw error
  return data
}
