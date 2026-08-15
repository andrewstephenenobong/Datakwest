-- Versioned learning-event and feature-engineering foundation.
-- This is a deterministic feature baseline, not a trained ML model.

create table if not exists public.learning_event_registry (
  event_name text primary key,
  event_version integer not null default 1 check (event_version > 0),
  description text not null default '',
  schema_definition jsonb not null default '{}'::jsonb check (jsonb_typeof(schema_definition) = 'object'),
  consent_scope text not null default 'personalization',
  retention_days integer check (retention_days is null or retention_days > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.learning_event_registry (event_name, event_version, description, schema_definition, consent_scope, retention_days)
values
  ('lesson_opened', 1, 'Learner opened a published learning object.', '{"required":[]}'::jsonb, 'personalization', 730),
  ('lesson_completed', 1, 'Learner completed a published learning object.', '{"required":["duration_seconds"]}'::jsonb, 'personalization', 730),
  ('practice_started', 1, 'Learner started a practice activity.', '{"required":[]}'::jsonb, 'personalization', 730),
  ('practice_answer_submitted', 1, 'Learner submitted a practice answer for verification.', '{"required":["attempt_id"]}'::jsonb, 'personalization', 730),
  ('quiz_submitted', 1, 'Learner submitted a quiz attempt for verification.', '{"required":["attempt_id"]}'::jsonb, 'personalization', 730),
  ('project_submitted', 1, 'Learner submitted a project artifact for review.', '{"required":["submission_id"]}'::jsonb, 'personalization', 730),
  ('tutor_message_sent', 1, 'Learner sent a message to the Tutor Orchestrator.', '{"required":["mode"]}'::jsonb, 'personalization', 730),
  ('recommendation_impression', 1, 'A server recommendation was shown to a learner.', '{"required":["recommendation_type","model_version"]}'::jsonb, 'personalization', 730),
  ('recommendation_started', 1, 'Learner started the recommended action.', '{"required":["recommendation_type","model_version"]}'::jsonb, 'personalization', 730),
  ('recommendation_completed', 1, 'Learner completed the recommended action.', '{"required":["recommendation_type","model_version"]}'::jsonb, 'personalization', 730)
on conflict (event_name) do update set
  event_version = excluded.event_version,
  description = excluded.description,
  schema_definition = excluded.schema_definition,
  consent_scope = excluded.consent_scope,
  retention_days = excluded.retention_days,
  active = true,
  updated_at = now();

alter table public.learner_interaction_events
  add column if not exists event_id uuid default gen_random_uuid(),
  add column if not exists event_version integer not null default 1,
  add column if not exists source text not null default 'client_rpc',
  add column if not exists received_at timestamptz not null default now();

create unique index if not exists learner_interaction_event_id_key
  on public.learner_interaction_events(event_id);
create index if not exists learner_interaction_event_name_version_idx
  on public.learner_interaction_events(event_name, event_version, created_at desc);

create table if not exists public.learning_feature_definitions (
  feature_key text primary key,
  feature_version integer not null default 1 check (feature_version > 0),
  description text not null default '',
  source_contract jsonb not null default '{}'::jsonb check (jsonb_typeof(source_contract) = 'object'),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.learning_feature_definitions (feature_key, feature_version, description, source_contract)
values
  ('verified_evidence_count', 1, 'Count of verified evidence records in the current learner graph.', '{"source":"learner_evidence","aggregation":"count","filter":"status=verified"}'::jsonb),
  ('verified_mastery_mean', 1, 'Mean deterministic mastery across graph nodes.', '{"source":"learner_node_mastery","aggregation":"mean","field":"mastery_score"}'::jsonb),
  ('mastery_coverage', 1, 'Share of graph nodes with at least one verified evidence record.', '{"source":"learner_node_mastery","aggregation":"mean","field":"evidence_count>0"}'::jsonb),
  ('recent_learning_events_30d', 1, 'Count of canonical learner events in the last 30 days.', '{"source":"learner_interaction_events","aggregation":"count","window_days":30}'::jsonb),
  ('active_learning_days_30d', 1, 'Distinct learner activity days in the last 30 days.', '{"source":"learner_interaction_events","aggregation":"count_distinct_date","window_days":30}'::jsonb),
  ('practice_verification_rate', 1, 'Share of submitted practice evidence that has reached verified status.', '{"source":"learner_evidence","aggregation":"verified_over_submitted","evidence_kind":"practice"}'::jsonb)
on conflict (feature_key) do update set
  feature_version = excluded.feature_version,
  description = excluded.description,
  source_contract = excluded.source_contract,
  active = true,
  updated_at = now();

create table if not exists public.learner_feature_snapshots (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  skill_graph_version_id uuid references public.skill_graph_versions(id) on delete set null,
  feature_set_version integer not null default 1,
  cutoff_at timestamptz not null,
  feature_values jsonb not null default '{}'::jsonb check (jsonb_typeof(feature_values) = 'object'),
  source_event_count integer not null default 0 check (source_event_count >= 0),
  source_evidence_count integer not null default 0 check (source_evidence_count >= 0),
  generated_by text not null default 'deterministic-feature-baseline-v1',
  generated_at timestamptz not null default now(),
  unique (learner_id, skill_graph_version_id, feature_set_version, cutoff_at)
);

alter table public.learning_event_registry enable row level security;
alter table public.learning_feature_definitions enable row level security;
alter table public.learner_feature_snapshots enable row level security;

create policy "Authenticated users can view active event registry"
  on public.learning_event_registry for select to authenticated using (active = true);
create policy "Authenticated users can view active feature definitions"
  on public.learning_feature_definitions for select to authenticated using (active = true);
create policy "Users can view own feature snapshots"
  on public.learner_feature_snapshots for select to authenticated using (auth.uid() = learner_id);

create or replace function public.record_versioned_learning_event(
  p_event_name text,
  p_event_value jsonb default '{}'::jsonb,
  p_session_id uuid default null,
  p_skill_id uuid default null,
  p_skill_graph_node_id uuid default null,
  p_learning_object_version_id uuid default null,
  p_event_id uuid default null
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_event learning_event_registry%rowtype;
  v_event_row bigint;
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

  select * into v_event
  from public.learning_event_registry
  where event_name = trim(p_event_name) and active = true;
  if v_event.event_name is null then
    raise exception 'event_not_registered' using errcode = '22023';
  end if;

  insert into public.learner_interaction_events (
    event_id, learner_id, session_id, event_name, event_version,
    skill_id, skill_graph_node_id, learning_object_version_id,
    event_value, consent_scope, source, received_at
  ) values (
    coalesce(p_event_id, gen_random_uuid()), v_user_id, p_session_id,
    v_event.event_name, v_event.event_version, p_skill_id,
    p_skill_graph_node_id, p_learning_object_version_id, p_event_value,
    v_event.consent_scope, 'versioned_event_rpc', now()
  )
  on conflict (event_id) do nothing
  returning id into v_event_row;

  return v_event_row;
end;
$$;

create or replace function public.materialize_learner_feature_snapshot(
  p_learner_id uuid,
  p_skill_graph_version_id uuid,
  p_cutoff_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_count integer;
  v_evidence_count integer;
  v_verified_evidence_count integer;
  v_verified_practice_count integer;
  v_submitted_practice_count integer;
  v_mastery_mean numeric;
  v_coverage numeric;
  v_active_days integer;
  v_values jsonb;
  v_snapshot public.learner_feature_snapshots;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_learner_id is null or p_cutoff_at is null then
    raise exception 'learner_and_cutoff_required' using errcode = '22023';
  end if;

  select count(*)::integer, count(*) filter (where status = 'verified')::integer
  into v_evidence_count, v_verified_evidence_count
  from public.learner_evidence
  where learner_id = p_learner_id
    and submitted_at <= p_cutoff_at;

  select count(*) filter (where evidence_kind = 'practice')::integer,
         count(*) filter (where evidence_kind = 'practice' and status = 'verified')::integer
  into v_submitted_practice_count, v_verified_practice_count
  from public.learner_evidence
  where learner_id = p_learner_id
    and submitted_at <= p_cutoff_at;

  select count(*)::integer,
         count(distinct date_trunc('day', created_at))::integer
  into v_event_count, v_active_days
  from public.learner_interaction_events
  where learner_id = p_learner_id
    and created_at <= p_cutoff_at
    and created_at > p_cutoff_at - interval '30 days';

  select coalesce(avg(m.mastery_score), 0),
         coalesce(avg(case when m.evidence_count > 0 then 1 else 0 end), 0)
  into v_mastery_mean, v_coverage
  from public.learner_node_mastery m
  where m.learner_id = p_learner_id
    and (p_skill_graph_version_id is null or m.skill_graph_version_id = p_skill_graph_version_id);

  v_values := jsonb_build_object(
    'verified_evidence_count', coalesce(v_verified_evidence_count, 0),
    'verified_mastery_mean', least(1, greatest(0, coalesce(v_mastery_mean, 0))),
    'mastery_coverage', least(1, greatest(0, coalesce(v_coverage, 0))),
    'recent_learning_events_30d', coalesce(v_event_count, 0),
    'active_learning_days_30d', coalesce(v_active_days, 0),
    'practice_verification_rate', case when coalesce(v_submitted_practice_count, 0) = 0 then 0 else round(v_verified_practice_count::numeric / v_submitted_practice_count::numeric, 5) end
  );

  insert into public.learner_feature_snapshots (
    learner_id, skill_graph_version_id, feature_set_version,
    cutoff_at, feature_values, source_event_count,
    source_evidence_count, generated_by, generated_at
  ) values (
    p_learner_id, p_skill_graph_version_id, 1,
    p_cutoff_at, v_values, coalesce(v_event_count, 0),
    coalesce(v_evidence_count, 0), 'deterministic-feature-baseline-v1', now()
  )
  on conflict (learner_id, skill_graph_version_id, feature_set_version, cutoff_at)
  do update set
    feature_values = excluded.feature_values,
    source_event_count = excluded.source_event_count,
    source_evidence_count = excluded.source_evidence_count,
    generated_by = excluded.generated_by,
    generated_at = excluded.generated_at
  returning * into v_snapshot;

  return jsonb_build_object(
    'snapshot_id', v_snapshot.id,
    'learner_id', p_learner_id,
    'skill_graph_version_id', p_skill_graph_version_id,
    'feature_set_version', 1,
    'cutoff_at', p_cutoff_at,
    'feature_values', v_values,
    'source_event_count', coalesce(v_event_count, 0),
    'source_evidence_count', coalesce(v_evidence_count, 0),
    'generated_by', 'deterministic-feature-baseline-v1'
  );
end;
$$;

revoke all on function public.record_versioned_learning_event(text, jsonb, uuid, uuid, uuid, uuid, uuid) from public;
revoke all on function public.materialize_learner_feature_snapshot(uuid, uuid, timestamptz) from public;
grant execute on function public.record_versioned_learning_event(text, jsonb, uuid, uuid, uuid, uuid, uuid) to authenticated;
grant execute on function public.materialize_learner_feature_snapshot(uuid, uuid, timestamptz) to service_role;

comment on table public.learning_feature_definitions is 'Versioned feature contracts and lineage for deterministic and future ML features.';
comment on table public.learner_feature_snapshots is 'Point-in-time, reproducible learner feature snapshots generated from server-owned evidence and events.';
comment on function public.materialize_learner_feature_snapshot(uuid, uuid, timestamptz) is 'Service-role-only deterministic feature baseline; no client-provided scores or features are accepted.';
