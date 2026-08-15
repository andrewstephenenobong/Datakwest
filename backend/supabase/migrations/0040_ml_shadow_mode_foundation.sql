-- Bounded ML foundation. This migration creates the model lifecycle and shadow-mode
-- contracts; it does not promote an unvalidated model into learner-facing decisions.

create table if not exists public.ml_models (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  model_version text not null,
  task_type text not null check (task_type in ('mastery_prediction', 'readiness_forecast', 'recommendation_ranking')),
  status text not null default 'planned' check (status in ('planned', 'training', 'shadow', 'canary', 'active', 'retired', 'failed')),
  feature_set_version integer not null default 1 check (feature_set_version > 0),
  target_definition jsonb not null default '{}'::jsonb check (jsonb_typeof(target_definition) = 'object'),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  artifact_uri text,
  artifact_hash text,
  shadow_only boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(model_key, model_version)
);

insert into public.ml_models (model_key, model_version, task_type, status, feature_set_version, target_definition, shadow_only)
values
  ('mastery_prediction', 'untrained-v0', 'mastery_prediction', 'planned', 1, '{"target":"future_verified_mastery","horizon_days":30}'::jsonb, true),
  ('readiness_forecast', 'untrained-v0', 'readiness_forecast', 'planned', 1, '{"target":"future_readiness_score","horizon_days":30}'::jsonb, true)
on conflict (model_key, model_version) do nothing;

create table if not exists public.ml_training_runs (
  id uuid primary key default gen_random_uuid(),
  model_id uuid references public.ml_models(id) on delete set null,
  feature_set_version integer not null,
  dataset_cutoff_at timestamptz not null,
  training_started_at timestamptz not null default now(),
  training_completed_at timestamptz,
  row_count integer not null default 0 check (row_count >= 0),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  failure_reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.ml_inference_requests (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null default gen_random_uuid() unique,
  model_id uuid references public.ml_models(id) on delete set null,
  learner_id uuid not null references auth.users(id) on delete cascade,
  skill_graph_version_id uuid references public.skill_graph_versions(id) on delete set null,
  feature_snapshot_id uuid references public.learner_feature_snapshots(id) on delete set null,
  input_hash text not null,
  prediction jsonb not null default '{}'::jsonb check (jsonb_typeof(prediction) = 'object'),
  explanation jsonb not null default '{}'::jsonb check (jsonb_typeof(explanation) = 'object'),
  serving_mode text not null default 'shadow' check (serving_mode in ('shadow', 'canary', 'active')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.ml_shadow_outcomes (
  id uuid primary key default gen_random_uuid(),
  inference_request_id uuid not null references public.ml_inference_requests(id) on delete cascade,
  observed_at timestamptz not null default now(),
  target_name text not null,
  target_value numeric,
  target_source text not null,
  error_value numeric,
  evaluated boolean not null default false,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique(inference_request_id, target_name)
);

create index if not exists ml_models_task_status_idx
  on public.ml_models(task_type, status, updated_at desc);
create index if not exists ml_inference_requests_learner_time_idx
  on public.ml_inference_requests(learner_id, created_at desc);
create index if not exists ml_inference_requests_model_time_idx
  on public.ml_inference_requests(model_id, serving_mode, created_at desc);
create index if not exists ml_shadow_outcomes_evaluation_idx
  on public.ml_shadow_outcomes(target_name, evaluated, observed_at desc);

alter table public.ml_models enable row level security;
alter table public.ml_training_runs enable row level security;
alter table public.ml_inference_requests enable row level security;
alter table public.ml_shadow_outcomes enable row level security;

create policy "Authenticated users can view non-artifact model status"
  on public.ml_models for select to authenticated
  using (true);
create policy "Users can view own ML inference requests"
  on public.ml_inference_requests for select to authenticated
  using (auth.uid() = learner_id);

create or replace function public.get_shadow_model_contract(p_model_key text default 'mastery_prediction')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_model public.ml_models;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_model
  from public.ml_models
  where model_key = coalesce(nullif(trim(p_model_key), ''), 'mastery_prediction')
    and status in ('shadow', 'canary', 'active', 'planned')
  order by updated_at desc
  limit 1;

  if v_model.id is null then
    return jsonb_build_object('available', false, 'reason', 'model_not_registered');
  end if;

  return jsonb_build_object(
    'available', v_model.status in ('shadow', 'canary', 'active'),
    'model_id', v_model.id,
    'model_key', v_model.model_key,
    'model_version', v_model.model_version,
    'task_type', v_model.task_type,
    'status', v_model.status,
    'feature_set_version', v_model.feature_set_version,
    'shadow_only', v_model.shadow_only,
    'metrics', v_model.metrics
  );
end;
$$;

create or replace function public.record_ml_shadow_prediction(
  p_request_id uuid,
  p_model_id uuid,
  p_learner_id uuid,
  p_skill_graph_version_id uuid,
  p_feature_snapshot_id uuid,
  p_input_hash text,
  p_prediction jsonb,
  p_explanation jsonb default '{}'::jsonb,
  p_serving_mode text default 'shadow',
  p_latency_ms integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_learner_id is null or nullif(trim(coalesce(p_input_hash, '')), '') is null then
    raise exception 'prediction_identity_required' using errcode = '22023';
  end if;
  if p_prediction is null or jsonb_typeof(p_prediction) <> 'object' then
    raise exception 'prediction_must_be_object' using errcode = '22023';
  end if;
  if p_serving_mode not in ('shadow', 'canary', 'active') then
    raise exception 'invalid_serving_mode' using errcode = '22023';
  end if;

  insert into public.ml_inference_requests (
    request_id, model_id, learner_id, skill_graph_version_id,
    feature_snapshot_id, input_hash, prediction, explanation,
    serving_mode, latency_ms
  ) values (
    coalesce(p_request_id, gen_random_uuid()), p_model_id, p_learner_id,
    p_skill_graph_version_id, p_feature_snapshot_id, p_input_hash,
    p_prediction, coalesce(p_explanation, '{}'::jsonb), p_serving_mode,
    p_latency_ms
  )
  on conflict (request_id) do update set
    prediction = excluded.prediction,
    explanation = excluded.explanation,
    serving_mode = excluded.serving_mode,
    latency_ms = excluded.latency_ms
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.get_shadow_model_contract(text) from public;
revoke all on function public.record_ml_shadow_prediction(uuid, uuid, uuid, uuid, uuid, text, jsonb, jsonb, text, integer) from public;
grant execute on function public.get_shadow_model_contract(text) to authenticated;
grant execute on function public.record_ml_shadow_prediction(uuid, uuid, uuid, uuid, uuid, text, jsonb, jsonb, text, integer) to service_role;

comment on table public.ml_models is 'Versioned model registry. Models must earn promotion through evaluation and shadow evidence; planned models are not learner-facing.';
comment on table public.ml_inference_requests is 'Auditable feature-bound model predictions. Shadow predictions never mutate learner mastery or recommendations.';
comment on function public.record_ml_shadow_prediction(uuid, uuid, uuid, uuid, uuid, text, jsonb, jsonb, text, integer) is 'Service-role-only prediction recorder for shadow-mode model evaluation.';
