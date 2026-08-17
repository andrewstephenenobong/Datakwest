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
