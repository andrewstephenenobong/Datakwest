-- Evidence verification and deterministic mastery projection baseline.
-- The client cannot call these RPCs or write verifier fields/mastery projections.

create or replace function public._recompute_learner_mastery_internal(
  p_learner_id uuid,
  p_skill_graph_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_node public.skill_graph_nodes;
  v_mastery numeric;
  v_confidence numeric;
  v_evidence_count integer;
  v_last_evidence_at timestamptz;
  v_total_evidence integer := 0;
  v_total_nodes integer := 0;
  v_covered_nodes integer := 0;
  v_readiness numeric := 0;
  v_coverage numeric := 0;
  v_recommended_node_id uuid;
  v_recommendation_reason jsonb := '{}'::jsonb;
  v_model_version text := 'deterministic-baseline-v1';
begin
  if p_learner_id is null or p_skill_graph_version_id is null then
    raise exception 'learner_and_graph_version_required' using errcode = '22023';
  end if;

  delete from public.learner_node_mastery
  where learner_id = p_learner_id
    and skill_graph_version_id = p_skill_graph_version_id;

  for v_node in
    select n.*
    from public.skill_graph_nodes n
    where n.skill_graph_version_id = p_skill_graph_version_id
    order by n.order_index, n.id
  loop
    v_total_nodes := v_total_nodes + 1;

    select
      count(*)::integer,
      avg(coalesce(ea.correctness, case when ea.max_score is not null and ea.max_score > 0 then ea.score / ea.max_score else null end)),
      max(le.submitted_at)
    into v_evidence_count, v_mastery, v_last_evidence_at
    from public.learner_evidence le
    join public.evidence_attempts ea on ea.evidence_id = le.id
    where le.learner_id = p_learner_id
      and le.skill_graph_node_id = v_node.id
      and le.status = 'verified'
      and (ea.correctness is not null or (ea.score is not null and ea.max_score is not null and ea.max_score > 0));

    v_mastery := least(1, greatest(0, coalesce(v_mastery, 0)));
    v_confidence := case
      when v_evidence_count <= 0 then 0
      else least(1, 0.35 + (least(v_evidence_count, 4) - 1) * 0.15)
    end;

    if v_evidence_count > 0 then
      v_covered_nodes := v_covered_nodes + 1;
    end if;

    insert into public.learner_node_mastery (
      learner_id, skill_graph_version_id, skill_graph_node_id,
      mastery_score, confidence_score, evidence_count,
      last_evidence_at, next_review_at, model_version, computed_at
    ) values (
      p_learner_id, p_skill_graph_version_id, v_node.id,
      v_mastery, v_confidence, v_evidence_count,
      v_last_evidence_at,
      case when v_evidence_count > 0 and v_mastery < coalesce(v_node.mastery_threshold, 0.8)
        then now() + interval '3 days' else null end,
      v_model_version, now()
    )
    on conflict (learner_id, skill_graph_version_id, skill_graph_node_id)
    do update set
      mastery_score = excluded.mastery_score,
      confidence_score = excluded.confidence_score,
      evidence_count = excluded.evidence_count,
      last_evidence_at = excluded.last_evidence_at,
      next_review_at = excluded.next_review_at,
      model_version = excluded.model_version,
      computed_at = excluded.computed_at;

    if v_recommended_node_id is null
      and (v_evidence_count = 0 or v_mastery < coalesce(v_node.mastery_threshold, 0.8)) then
      v_recommended_node_id := v_node.id;
      v_recommendation_reason := jsonb_build_object(
        'strategy', 'deterministic_baseline',
        'reason', case when v_evidence_count = 0 then 'node_has_no_verified_evidence' else 'node_needs_more_verified_evidence' end,
        'node_key', v_node.node_key,
        'model_version', v_model_version
      );
    end if;
  end loop;

  if v_total_nodes > 0 then
    v_coverage := v_covered_nodes::numeric / v_total_nodes::numeric;
    select coalesce(avg(m.mastery_score), 0)
    into v_readiness
    from public.learner_node_mastery m
    where m.learner_id = p_learner_id
      and m.skill_graph_version_id = p_skill_graph_version_id;
  end if;

  select coalesce(sum(m.evidence_count), 0)::integer
  into v_total_evidence
  from public.learner_node_mastery m
  where m.learner_id = p_learner_id
    and m.skill_graph_version_id = p_skill_graph_version_id;

  insert into public.learner_skill_state (
    learner_id, skill_graph_version_id, readiness_score, coverage_score,
    evidence_count, recommended_node_id, recommendation_reason,
    model_version, computed_at
  )
  select
    p_learner_id,
    p_skill_graph_version_id,
    least(1, greatest(0, coalesce(v_readiness, 0))),
    least(1, greatest(0, coalesce(v_coverage, 0))),
    v_total_evidence,
    v_recommended_node_id,
    v_recommendation_reason,
    v_model_version,
    now()
  on conflict (learner_id, skill_graph_version_id)
  do update set
    readiness_score = excluded.readiness_score,
    coverage_score = excluded.coverage_score,
    evidence_count = excluded.evidence_count,
    recommended_node_id = excluded.recommended_node_id,
    recommendation_reason = excluded.recommendation_reason,
    model_version = excluded.model_version,
    computed_at = excluded.computed_at;

  return jsonb_build_object(
    'learner_id', p_learner_id,
    'skill_graph_version_id', p_skill_graph_version_id,
    'model_version', v_model_version,
    'total_nodes', v_total_nodes,
    'covered_nodes', v_covered_nodes,
    'readiness_score', least(1, greatest(0, coalesce(v_readiness, 0))),
    'coverage_score', least(1, greatest(0, coalesce(v_coverage, 0))),
    'recommended_node_id', v_recommended_node_id
  );
end;
$$;

create or replace function public.recompute_learner_mastery(
  p_learner_id uuid,
  p_skill_graph_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  return public._recompute_learner_mastery_internal(p_learner_id, p_skill_graph_version_id);
end;
$$;

create or replace function public.verify_learning_evidence(
  p_evidence_id uuid,
  p_status text,
  p_verifier_version text,
  p_verifier_confidence numeric default null,
  p_correctness numeric default null,
  p_score numeric default null,
  p_max_score numeric default null,
  p_hints_used integer default 0,
  p_duration_seconds integer default null,
  p_misconception_codes text[] default '{}',
  p_feedback jsonb default '{}',
  p_server_metadata jsonb default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evidence public.learner_evidence;
  v_attempt public.evidence_attempts;
  v_enrolment public.learner_skill_enrolments;
  v_projection jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_status not in ('verified', 'needs_revision', 'rejected') then
    raise exception 'invalid_verification_status' using errcode = '22023';
  end if;
  if nullif(trim(coalesce(p_verifier_version, '')), '') is null then
    raise exception 'verifier_version_required' using errcode = '22023';
  end if;
  if p_verifier_confidence is not null and (p_verifier_confidence < 0 or p_verifier_confidence > 1) then
    raise exception 'invalid_verifier_confidence' using errcode = '22023';
  end if;
  if p_correctness is not null and (p_correctness < 0 or p_correctness > 1) then
    raise exception 'invalid_correctness' using errcode = '22023';
  end if;
  if p_score is not null and p_max_score is not null and (p_max_score <= 0 or p_score < 0 or p_score > p_max_score) then
    raise exception 'invalid_score_range' using errcode = '22023';
  end if;
  if p_feedback is null or jsonb_typeof(p_feedback) <> 'object' then
    raise exception 'feedback_must_be_object' using errcode = '22023';
  end if;
  if p_server_metadata is null or jsonb_typeof(p_server_metadata) <> 'object' then
    raise exception 'server_metadata_must_be_object' using errcode = '22023';
  end if;

  select * into v_evidence
  from public.learner_evidence
  where id = p_evidence_id
  for update;

  if v_evidence.id is null then
    raise exception 'evidence_not_found' using errcode = 'P0002';
  end if;

  insert into public.evidence_attempts (
    evidence_id, score, max_score, correctness, hints_used,
    duration_seconds, verifier_version, verifier_confidence,
    misconception_codes, feedback
  ) values (
    v_evidence.id, p_score, p_max_score, p_correctness, greatest(0, coalesce(p_hints_used, 0)),
    p_duration_seconds, p_verifier_version, p_verifier_confidence,
    coalesce(p_misconception_codes, '{}'), p_feedback
  )
  on conflict (evidence_id) do update set
    score = excluded.score,
    max_score = excluded.max_score,
    correctness = excluded.correctness,
    hints_used = excluded.hints_used,
    duration_seconds = excluded.duration_seconds,
    verifier_version = excluded.verifier_version,
    verifier_confidence = excluded.verifier_confidence,
    misconception_codes = excluded.misconception_codes,
    feedback = excluded.feedback,
    created_at = now()
  returning * into v_attempt;

  update public.learner_evidence
  set status = p_status,
      verified_at = case when p_status = 'verified' then now() else null end,
      submitted_at = coalesce(submitted_at, now()),
      server_metadata = coalesce(server_metadata, '{}'::jsonb) || p_server_metadata || jsonb_build_object(
        'verification_status', p_status,
        'verified_by', 'service_role_verifier',
        'verifier_version', p_verifier_version,
        'verified_at', now()
      )
  where id = v_evidence.id;

  select * into v_enrolment
  from public.learner_skill_enrolments e
  where e.id = v_evidence.enrolment_id;
  if v_enrolment.id is null then
    raise exception 'enrolment_not_found' using errcode = 'P0002';
  end if;

  if p_status in ('verified', 'needs_revision', 'rejected') then
    v_projection := public._recompute_learner_mastery_internal(v_enrolment.learner_id, v_enrolment.skill_graph_version_id);
  end if;


  return jsonb_build_object(
    'evidence_id', v_evidence.id,
    'status', p_status,
    'attempt_id', v_attempt.id,
    'projection', coalesce(v_projection, '{}'::jsonb)
  );
end;
$$;

-- Trigger-side recomputation is internal and runs after the trusted attempt row exists.
create or replace function public._recompute_mastery_after_verified_attempt()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_evidence public.learner_evidence;
  v_enrolment public.learner_skill_enrolments;
begin
  select * into v_evidence from public.learner_evidence where id = new.evidence_id;
  if v_evidence.status = 'verified' then
    select * into v_enrolment from public.learner_skill_enrolments where id = v_evidence.enrolment_id;
    if v_enrolment.id is not null then
      perform public._recompute_learner_mastery_internal(v_enrolment.learner_id, v_enrolment.skill_graph_version_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists recompute_mastery_after_verified_attempt on public.evidence_attempts;
create trigger recompute_mastery_after_verified_attempt
after insert or update of correctness, score, max_score on public.evidence_attempts
for each row execute function public._recompute_mastery_after_verified_attempt();

revoke all on function public._recompute_learner_mastery_internal(uuid, uuid) from public;
revoke all on function public.recompute_learner_mastery(uuid, uuid) from public;
revoke all on function public.verify_learning_evidence(uuid, text, text, numeric, numeric, numeric, numeric, integer, integer, text[], jsonb, jsonb) from public;
grant execute on function public.recompute_learner_mastery(uuid, uuid) to service_role;
grant execute on function public.verify_learning_evidence(uuid, text, text, numeric, numeric, numeric, numeric, integer, integer, text[], jsonb, jsonb) to service_role;

comment on function public.recompute_learner_mastery(uuid, uuid) is 'Service-role-only deterministic baseline projection from verified evidence; not an ML model and never client-authoritative.';
comment on function public.verify_learning_evidence(uuid, text, text, numeric, numeric, numeric, numeric, integer, integer, text[], jsonb, jsonb) is 'Service-role-only verifier boundary that writes trusted verifier output and triggers deterministic mastery projection.';
