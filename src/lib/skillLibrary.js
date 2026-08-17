export function markActiveSkill(enrolments, activeEnrolmentId) {
  return (enrolments || []).map((enrolment) => ({
    ...enrolment,
    is_active: Boolean(activeEnrolmentId && enrolment.id === activeEnrolmentId),
  }))
}

export function upsertActiveSkill(enrolments, enrolment) {
  if (!enrolment?.id) return markActiveSkill(enrolments, null)
  return markActiveSkill([
    enrolment,
    ...(enrolments || []).filter((item) => item.id !== enrolment.id),
  ], enrolment.id)
}

export function createActiveSkillSwitchGuard() {
  let latestIntent = 0
  return {
    begin() {
      latestIntent += 1
      return latestIntent
    },
    isLatest(intent) {
      return intent === latestIntent
    },
  }
}

export function getSkillSwitchErrorMessage(error, online = true) {
  const message = String(error?.message || '').toLowerCase()
  if (!online || /network|fetch|offline|failed to fetch/.test(message)) {
    return 'You appear to be offline. Your current learning skill is unchanged; reconnect and try again.'
  }
  return 'We could not switch your active skill right now. Your current learning path is unchanged.'
}
