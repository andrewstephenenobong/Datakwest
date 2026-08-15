-- DataKwest Universal Skill Intelligence Foundation: protected learner RPCs.
-- Client code calls these functions; it does not write evidence or mastery directly.

create or replace function public.create_skill_enrolment(
  p_skill_id uuid,
  p_skill_graph_version_id uuid default null,
  p_locale text default 'en',
  p_weekly_minutes integer default null,
  p_target_outcome text default ''
)
returns public.learner_skill_enrolments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_version_id uuid;
  v_row public.learner_skill_enrolments;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.skills s
    where s.id = p_skill_id and s.status <> 'archived'
  ) then
    raise exception 'skill_not_available' using errcode = '22023';
  end if;

  if p_skill_graph_version_id is not null then
    select v.id into v_version_id
    from public.skill_graph_versions v
    where v.id = p_skill_graph_version_id
      and v.skill_id = p_skill_id
      and v.locale = coalesce(nullif(p_locale, ''), 'en')
      and v.status = 'published';
  else
    select v.id into v_version_id
    from public.skill_graph_versions v
    where v.skill_id = p_skill_id
      and v.locale = coalesce(nullif(p_locale, ''), 'en')
      and v.status = 'published'
    order by v.version_no desc
    limit 1;
  end if;

  if v_version_id is null then
    raise exception 'published_skill_graph_not_found' using errcode = '22023';
  end if;

  insert into public.learner_skill_enrolments (
    learner_id, skill_id, skill_graph_version_id, status, source,
    target_outcome, weekly_minutes, locale
  ) values (
    v_user_id, p_skill_id, v_version_id, 'active', 'learner_selected',
    coalesce(p_target_outcome, ''), p_weekly_minutes, coalesce(nullif(p_locale, ''), 'en')
  )
  on conflict (learner_id, skill_id) where status = 'active'
  do update set
    skill_graph_version_id = excluded.skill_graph_version_id,
    target_outcome = excluded.target_outcome,
    weekly_minutes = excluded.weekly_minutes,
    locale = excluded.locale,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.start_learning_evidence(
  p_learning_object_version_id uuid
)
returns public.learner_evidence
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_object public.learning_object_versions;
  v_learning_object public.learning_objects;
  v_enrolment public.learner_skill_enrolments;
  v_attempt_no integer;
  v_row public.learner_evidence;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_object
  from public.learning_object_versions lov
  where lov.id = p_learning_object_version_id
    and lov.status = 'published';

  if v_object.id is null then
    raise exception 'learning_object_not_available' using errcode = '22023';
  end if;

  select * into v_learning_object
  from public.learning_objects lo
  where lo.id = v_object.learning_object_id
    and lo.status = 'published';

  if v_learning_object.id is null then
    raise exception 'learning_object_not_available' using errcode = '22023';
  end if;

  select e.* into v_enrolment
  from public.learner_skill_enrolments e
  join public.skill_graph_versions v on v.id = e.skill_graph_version_id
  where e.learner_id = v_user_id
    and e.status = 'active'
    and e.skill_graph_version_id = v_learning_object.skill_graph_version_id
  order by e.updated_at desc
  limit 1;

  if v_enrolment.id is null then
    raise exception 'active_skill_enrolment_required' using errcode = '22023';
  end if;

  select coalesce(max(le.attempt_no), 0) + 1 into v_attempt_no
  from public.learner_evidence le
  where le.learner_id = v_user_id
    and le.learning_object_version_id = p_learning_object_version_id;

  insert into public.learner_evidence (
    learner_id, enrolment_id, skill_graph_node_id,
    learning_object_version_id, evidence_kind, status, attempt_no, started_at
  ) values (
    v_user_id, v_enrolment.id, v_learning_object.skill_graph_node_id,
    p_learning_object_version_id, v_learning_object.object_type, 'submitted', v_attempt_no, now()
  )
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.submit_learning_evidence(
  p_evidence_id uuid,
  p_response jsonb,
  p_artifact_manifest jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_evidence public.learner_evidence;
  v_attempt_id uuid;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_response is null or jsonb_typeof(p_response) <> 'object' then
    raise exception 'response_must_be_object' using errcode = '22023';
  end if;
  if p_artifact_manifest is null or jsonb_typeof(p_artifact_manifest) <> 'object' then
    raise exception 'artifact_manifest_must_be_object' using errcode = '22023';
  end if;

  select * into v_evidence
  from public.learner_evidence le
  where le.id = p_evidence_id and le.learner_id = v_user_id
  for update;

  if v_evidence.id is null then
    raise exception 'evidence_not_found' using errcode = 'P0002';
  end if;
  if v_evidence.status not in ('submitted', 'needs_revision') then
    raise exception 'evidence_not_submittable' using errcode = '22023';
  end if;

  insert into public.evidence_attempts (evidence_id, response, verifier_version, feedback)
  values (
    v_evidence.id,
    p_response,
    'pending-verification-v1',
    jsonb_build_object('artifact_manifest', p_artifact_manifest)
  )
  returning id into v_attempt_id;

  update public.learner_evidence
  set status = 'processing', submitted_at = now(), server_metadata = jsonb_build_object(
    'submission_attempt_id', v_attempt_id,
    'received_at', now()
  )
  where id = v_evidence.id;

  return jsonb_build_object(
    'evidence_id', v_evidence.id,
    'status', 'processing',
    'attempt_id', v_attempt_id,
    'mastery_updated', false,
    'next_action', 'verification_pending'
  );
end;
$$;

create or replace function public.get_learner_skill_state(
  p_enrolment_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_enrolment public.learner_skill_enrolments;
  v_state public.learner_skill_state;
  v_nodes jsonb;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_enrolment
  from public.learner_skill_enrolments e
  where e.id = p_enrolment_id and e.learner_id = v_user_id;
  if v_enrolment.id is null then
    raise exception 'enrolment_not_found' using errcode = 'P0002';
  end if;

  select * into v_state
  from public.learner_skill_state s
  where s.learner_id = v_user_id
    and s.skill_graph_version_id = v_enrolment.skill_graph_version_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'node_id', m.skill_graph_node_id,
    'mastery_score', m.mastery_score,
    'confidence_score', m.confidence_score,
    'evidence_count', m.evidence_count,
    'next_review_at', m.next_review_at,
    'model_version', m.model_version
  ) order by m.computed_at desc), '[]'::jsonb)
  into v_nodes
  from public.learner_node_mastery m
  where m.learner_id = v_user_id
    and m.skill_graph_version_id = v_enrolment.skill_graph_version_id;

  return jsonb_build_object(
    'enrolment', to_jsonb(v_enrolment),
    'skill_state', case when v_state.id is null then '{}'::jsonb else to_jsonb(v_state) end,
    'node_mastery', v_nodes
  );
end;
$$;

create or replace function public.update_learner_preferences(
  p_locale text default 'en',
  p_timezone text default null,
  p_weekly_minutes integer default null,
  p_preferred_modalities text[] default '{}',
  p_accessibility jsonb default '{}'::jsonb,
  p_explanation_style text default null,
  p_age_band text default '13_plus',
  p_guardian_controlled boolean default false
)
returns public.learner_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.learner_preferences;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_accessibility is null or jsonb_typeof(p_accessibility) <> 'object' then
    raise exception 'accessibility_must_be_object' using errcode = '22023';
  end if;
  if p_age_band not in ('under_6', '6_12', '13_plus', 'adult') then
    raise exception 'invalid_age_band' using errcode = '22023';
  end if;

  insert into public.learner_preferences (
    learner_id, locale, timezone, weekly_minutes, preferred_modalities,
    accessibility, explanation_style, age_band, guardian_controlled, updated_at
  ) values (
    v_user_id, coalesce(nullif(p_locale, ''), 'en'), p_timezone, p_weekly_minutes,
    coalesce(p_preferred_modalities, '{}'), p_accessibility, p_explanation_style,
    p_age_band, coalesce(p_guardian_controlled, false), now()
  )
  on conflict (learner_id) do update set
    locale = excluded.locale,
    timezone = excluded.timezone,
    weekly_minutes = excluded.weekly_minutes,
    preferred_modalities = excluded.preferred_modalities,
    accessibility = excluded.accessibility,
    explanation_style = excluded.explanation_style,
    age_band = excluded.age_band,
    guardian_controlled = excluded.guardian_controlled,
    updated_at = now()
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.record_learner_interaction(
  p_event_name text,
  p_event_value jsonb default '{}'::jsonb,
  p_session_id uuid default null,
  p_skill_id uuid default null,
  p_skill_graph_node_id uuid default null,
  p_learning_object_version_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event_id bigint;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if nullif(trim(p_event_name), '') is null then
    raise exception 'event_name_required' using errcode = '22023';
  end if;
  if p_event_value is null or jsonb_typeof(p_event_value) <> 'object' then
    raise exception 'event_value_must_be_object' using errcode = '22023';
  end if;

  insert into public.learner_interaction_events (
    learner_id, session_id, event_name, skill_id,
    skill_graph_node_id, learning_object_version_id, event_value
  ) values (
    v_user_id, p_session_id, left(trim(p_event_name), 120), p_skill_id,
    p_skill_graph_node_id, p_learning_object_version_id, p_event_value
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.create_skill_enrolment(uuid, uuid, text, integer, text) from public;
revoke all on function public.start_learning_evidence(uuid) from public;
revoke all on function public.submit_learning_evidence(uuid, jsonb, jsonb) from public;
revoke all on function public.get_learner_skill_state(uuid) from public;
revoke all on function public.update_learner_preferences(text, text, integer, text[], jsonb, text, text, boolean) from public;
revoke all on function public.record_learner_interaction(text, jsonb, uuid, uuid, uuid, uuid) from public;

grant execute on function public.create_skill_enrolment(uuid, uuid, text, integer, text) to authenticated;
grant execute on function public.start_learning_evidence(uuid) to authenticated;
grant execute on function public.submit_learning_evidence(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.get_learner_skill_state(uuid) to authenticated;
grant execute on function public.update_learner_preferences(text, text, integer, text[], jsonb, text, text, boolean) to authenticated;
grant execute on function public.record_learner_interaction(text, jsonb, uuid, uuid, uuid, uuid) to authenticated;
