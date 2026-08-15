-- Compatibility adapters for legacy learner flows.
-- All evidence is derived from server-owned legacy records; clients cannot submit scores,
-- verification states, or mastery projections directly.

create or replace function public.sync_legacy_practice_evidence(
  p_attempt_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_attempt public.attempts;
  v_item public.practice_items;
  v_enrolment public.learner_skill_enrolments;
  v_node public.skill_graph_nodes;
  v_evidence public.learner_evidence;
  v_attempt_evidence_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_attempt
  from public.attempts
  where id = p_attempt_id and user_id = v_user_id and practice_item_id is not null;

  if not found then
    raise exception 'practice_attempt_not_found' using errcode = 'P0002';
  end if;

  select * into v_item from public.practice_items where id = v_attempt.practice_item_id;

  select e.* into v_enrolment
  from public.learner_skill_enrolments e
  where e.learner_id = v_user_id
    and e.skill_id = v_item.skill_id
    and e.status = 'active'
  order by e.updated_at desc
  limit 1;

  if v_enrolment.id is null then
    return jsonb_build_object('synced', false, 'reason', 'active_skill_enrolment_not_found', 'attempt_id', p_attempt_id);
  end if;

  select n.* into v_node
  from public.skill_graph_nodes n
  where n.skill_graph_version_id = v_enrolment.skill_graph_version_id
    and n.node_type in ('practice', 'concept', 'capability')
  order by case when n.node_type = 'practice' then 0 else 1 end, n.order_index
  limit 1;

  select le.* into v_evidence
  from public.learner_evidence le
  where le.learner_id = v_user_id
    and (le.server_metadata ->> 'legacy_attempt_id') = p_attempt_id::text
  limit 1;

  if v_evidence.id is null then
    insert into public.learner_evidence (
      learner_id, enrolment_id, skill_graph_node_id, evidence_kind,
      status, attempt_no, submitted_at, verified_at, server_metadata
    ) values (
      v_user_id, v_enrolment.id, v_node.id, 'practice', 'verified', 1,
      coalesce(v_attempt.created_at, now()), coalesce(v_attempt.created_at, now()),
      jsonb_build_object(
        'source', 'legacy_practice_attempt',
        'legacy_attempt_id', p_attempt_id,
        'practice_item_id', v_attempt.practice_item_id
      )
    ) returning * into v_evidence;

    insert into public.evidence_attempts (
      evidence_id, response, score, max_score, correctness,
      duration_seconds, verifier_version, verifier_confidence, feedback
    ) values (
      v_evidence.id,
      coalesce(v_attempt.answer, '{}'::jsonb),
      v_attempt.score,
      100,
      case when coalesce(v_attempt.score, 0) >= 80 then 1 else 0 end,
      v_attempt.duration_seconds,
      'legacy-practice-server-v1',
      1,
      coalesce(v_attempt.feedback, '{}'::jsonb)
    ) returning evidence_id into v_attempt_evidence_id;
  end if;

  perform public.record_learner_interaction(
    'legacy_practice_evidence_synced',
    jsonb_build_object('attempt_id', p_attempt_id, 'evidence_id', v_evidence.id),
    null, v_item.skill_id, v_node.id, null
  );

  return jsonb_build_object(
    'synced', true,
    'evidence_id', v_evidence.id,
    'attempt_id', p_attempt_id,
    'status', v_evidence.status
  );
end;
$$;

create or replace function public.sync_legacy_project_evidence(
  p_submission_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission public.submissions;
  v_project public.projects;
  v_enrolment public.learner_skill_enrolments;
  v_node public.skill_graph_nodes;
  v_evidence public.learner_evidence;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_submission
  from public.submissions
  where id = p_submission_id and user_id = v_user_id and status in ('submitted', 'in_review', 'reviewed', 'published');
  if not found then
    raise exception 'project_submission_not_found' using errcode = 'P0002';
  end if;

  select * into v_project from public.projects where id = v_submission.project_id;
  if v_project.skill_id is null then
    return jsonb_build_object('synced', false, 'reason', 'project_skill_not_mapped', 'submission_id', p_submission_id);
  end if;

  select e.* into v_enrolment
  from public.learner_skill_enrolments e
  where e.learner_id = v_user_id and e.skill_id = v_project.skill_id and e.status = 'active'
  order by e.updated_at desc limit 1;
  if v_enrolment.id is null then
    return jsonb_build_object('synced', false, 'reason', 'active_skill_enrolment_not_found', 'submission_id', p_submission_id);
  end if;

  select n.* into v_node
  from public.skill_graph_nodes n
  where n.skill_graph_version_id = v_enrolment.skill_graph_version_id and n.node_type = 'project'
  order by n.order_index limit 1;

  select le.* into v_evidence
  from public.learner_evidence le
  where le.learner_id = v_user_id
    and (le.server_metadata ->> 'legacy_submission_id') = p_submission_id::text
  limit 1;

  if v_evidence.id is null then
    insert into public.learner_evidence (
      learner_id, enrolment_id, skill_graph_node_id, evidence_kind,
      status, attempt_no, submitted_at, server_metadata
    ) values (
      v_user_id, v_enrolment.id, v_node.id, 'project',
      case when v_submission.status in ('reviewed', 'published') then 'verified' else 'processing' end,
      1, coalesce(v_submission.submitted_at, now()),
      jsonb_build_object(
        'source', 'legacy_project_submission',
        'legacy_submission_id', p_submission_id,
        'project_id', v_submission.project_id,
        'review_status', v_submission.status
      )
    ) returning * into v_evidence;

    insert into public.evidence_attempts (evidence_id, response, verifier_version, feedback)
    values (
      v_evidence.id,
      jsonb_build_object('evidence', coalesce(v_submission.evidence, '{}'::jsonb), 'reflection', coalesce(v_submission.reflection, '')),
      'legacy-project-server-v1',
      jsonb_build_object('review_status', v_submission.status)
    );
  end if;

  perform public.record_learner_interaction(
    'legacy_project_evidence_synced',
    jsonb_build_object('submission_id', p_submission_id, 'evidence_id', v_evidence.id),
    null, v_project.skill_id, v_node.id, null
  );

  return jsonb_build_object('synced', true, 'evidence_id', v_evidence.id, 'submission_id', p_submission_id, 'status', v_evidence.status);
end;
$$;

revoke all on function public.sync_legacy_practice_evidence(uuid) from public;
revoke all on function public.sync_legacy_project_evidence(uuid) from public;
grant execute on function public.sync_legacy_practice_evidence(uuid) to authenticated;
grant execute on function public.sync_legacy_project_evidence(uuid) to authenticated;

comment on function public.sync_legacy_practice_evidence(uuid) is 'Compatibility adapter: derives immutable evidence from an existing server-owned practice attempt.';
comment on function public.sync_legacy_project_evidence(uuid) is 'Compatibility adapter: derives project evidence from an existing server-owned submission.';
