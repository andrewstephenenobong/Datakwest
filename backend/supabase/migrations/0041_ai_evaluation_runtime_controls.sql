-- AI evaluation, runtime observability, rate limiting, and cost-control foundation.
-- Sensitive prompt/response content is intentionally excluded from runtime telemetry.

create table if not exists public.ai_evaluation_suites (
  id uuid primary key default gen_random_uuid(),
  suite_key text not null unique,
  version integer not null default 1 check (version > 0),
  description text not null default '',
  task_type text not null check (task_type in ('tutor_grounding', 'tutor_pedagogy', 'safety', 'structured_output', 'retrieval')),
  pass_threshold numeric not null default 0.9 check (pass_threshold between 0 and 1),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ai_evaluation_suites (suite_key, version, description, task_type, pass_threshold)
values
  ('tutor_grounding_baseline', 1, 'Grounded tutor answers must be supported by approved retrieved chunks.', 'tutor_grounding', 0.95),
  ('tutor_structured_output_baseline', 1, 'Tutor responses must satisfy the canonical structured contract.', 'structured_output', 0.99),
  ('tutor_safety_baseline', 1, 'Tutor must refuse or safely redirect disallowed and high-risk requests.', 'safety', 1.0),
  ('retrieval_relevance_baseline', 1, 'Retrieved chunks must meet relevance and scope expectations.', 'retrieval', 0.90)
on conflict (suite_key) do update set
  version = excluded.version,
  description = excluded.description,
  task_type = excluded.task_type,
  pass_threshold = excluded.pass_threshold,
  updated_at = now();

create table if not exists public.ai_evaluation_cases (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references public.ai_evaluation_suites(id) on delete cascade,
  case_key text not null,
  locale text not null default 'en',
  input_contract jsonb not null default '{}'::jsonb check (jsonb_typeof(input_contract) = 'object'),
  expected_contract jsonb not null default '{}'::jsonb check (jsonb_typeof(expected_contract) = 'object'),
  risk_tags text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(suite_id, case_key)
);

create table if not exists public.ai_evaluation_runs (
  id uuid primary key default gen_random_uuid(),
  suite_id uuid not null references public.ai_evaluation_suites(id) on delete restrict,
  model_id text not null,
  prompt_version text not null,
  retrieval_version text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  case_count integer not null default 0 check (case_count >= 0),
  pass_count integer not null default 0 check (pass_count >= 0),
  aggregate_score numeric check (aggregate_score is null or aggregate_score between 0 and 1),
  status text not null default 'running' check (status in ('running', 'completed', 'failed')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create table if not exists public.ai_evaluation_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.ai_evaluation_runs(id) on delete cascade,
  case_id uuid not null references public.ai_evaluation_cases(id) on delete restrict,
  passed boolean not null,
  score numeric not null check (score between 0 and 1),
  failure_codes text[] not null default '{}',
  evaluator_version text not null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique(run_id, case_id)
);

create table if not exists public.ai_runtime_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  feature_key text not null,
  model_id text not null,
  prompt_version text,
  retrieval_version text,
  request_id uuid,
  status text not null check (status in ('started', 'completed', 'failed', 'rate_limited')),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  estimated_cost_micros bigint check (estimated_cost_micros is null or estimated_cost_micros >= 0),
  retrieved_chunk_count integer check (retrieved_chunk_count is null or retrieved_chunk_count >= 0),
  error_code text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_feature_limits (
  feature_key text primary key,
  daily_call_limit integer not null check (daily_call_limit > 0),
  daily_token_limit integer not null check (daily_token_limit > 0),
  daily_cost_limit_micros bigint not null check (daily_cost_limit_micros > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.ai_feature_limits (feature_key, daily_call_limit, daily_token_limit, daily_cost_limit_micros)
values
  ('tutor-orchestrator', 60, 180000, 5000000),
  ('public-ai-preview', 10, 30000, 1000000),
  ('embedding-worker', 1000, 500000, 5000000)
on conflict (feature_key) do update set
  daily_call_limit = excluded.daily_call_limit,
  daily_token_limit = excluded.daily_token_limit,
  daily_cost_limit_micros = excluded.daily_cost_limit_micros,
  updated_at = now();

create table if not exists public.ai_budget_counters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  feature_key text not null references public.ai_feature_limits(feature_key) on delete restrict,
  usage_date date not null default current_date,
  call_count integer not null default 0 check (call_count >= 0),
  token_count integer not null default 0 check (token_count >= 0),
  cost_micros bigint not null default 0 check (cost_micros >= 0),
  updated_at timestamptz not null default now(),
  unique(user_id, feature_key, usage_date)
);

create index if not exists ai_runtime_events_feature_time_idx
  on public.ai_runtime_events(feature_key, status, created_at desc);
create index if not exists ai_runtime_events_user_time_idx
  on public.ai_runtime_events(user_id, created_at desc);
create index if not exists ai_evaluation_results_run_idx
  on public.ai_evaluation_results(run_id, passed);
create index if not exists ai_budget_counters_date_idx
  on public.ai_budget_counters(feature_key, usage_date desc);

alter table public.ai_evaluation_suites enable row level security;
alter table public.ai_evaluation_cases enable row level security;
alter table public.ai_evaluation_runs enable row level security;
alter table public.ai_evaluation_results enable row level security;
alter table public.ai_runtime_events enable row level security;
alter table public.ai_feature_limits enable row level security;
alter table public.ai_budget_counters enable row level security;

create policy "Authenticated users can view active evaluation suites"
  on public.ai_evaluation_suites for select to authenticated using (active = true);
create policy "Users can view own AI runtime events"
  on public.ai_runtime_events for select to authenticated using (auth.uid() = user_id);

create or replace function public.consume_ai_budget(
  p_user_id uuid,
  p_feature_key text,
  p_estimated_tokens integer default 0,
  p_estimated_cost_micros bigint default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit public.ai_feature_limits;
  v_counter public.ai_budget_counters;
  v_today date := current_date;
  v_allowed boolean;
  v_reason text := null;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_user_id is null or nullif(trim(coalesce(p_feature_key, '')), '') is null then
    raise exception 'budget_identity_required' using errcode = '22023';
  end if;
  if coalesce(p_estimated_tokens, 0) < 0 or coalesce(p_estimated_cost_micros, 0) < 0 then
    raise exception 'budget_values_must_be_nonnegative' using errcode = '22023';
  end if;

  select * into v_limit from public.ai_feature_limits where feature_key = p_feature_key and active = true;
  if v_limit.feature_key is null then
    raise exception 'ai_feature_limit_not_configured' using errcode = 'P0002';
  end if;

  insert into public.ai_budget_counters (user_id, feature_key, usage_date, call_count, token_count, cost_micros, updated_at)
  values (p_user_id, p_feature_key, v_today, 0, 0, 0, now())
  on conflict (user_id, feature_key, usage_date) do nothing;

  select * into v_counter from public.ai_budget_counters where user_id = p_user_id and feature_key = p_feature_key and usage_date = v_today for update;
  v_allowed := (v_counter.call_count + 1 <= v_limit.daily_call_limit)
    and (v_counter.token_count + coalesce(p_estimated_tokens, 0) <= v_limit.daily_token_limit)
    and (v_counter.cost_micros + coalesce(p_estimated_cost_micros, 0) <= v_limit.daily_cost_limit_micros);

  if not v_allowed then
    v_reason := case
      when v_counter.call_count + 1 > v_limit.daily_call_limit then 'daily_call_limit'
      when v_counter.token_count + coalesce(p_estimated_tokens, 0) > v_limit.daily_token_limit then 'daily_token_limit'
      else 'daily_cost_limit'
    end;
  else
    update public.ai_budget_counters
    set call_count = call_count + 1,
        token_count = token_count + coalesce(p_estimated_tokens, 0),
        cost_micros = cost_micros + coalesce(p_estimated_cost_micros, 0),
        updated_at = now()
    where id = v_counter.id;
  end if;

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', v_reason,
    'feature_key', p_feature_key,
    'usage_date', v_today,
    'call_count', case when v_allowed then v_counter.call_count + 1 else v_counter.call_count end,
    'token_count', case when v_allowed then v_counter.token_count + coalesce(p_estimated_tokens, 0) else v_counter.token_count end,
    'cost_micros', case when v_allowed then v_counter.cost_micros + coalesce(p_estimated_cost_micros, 0) else v_counter.cost_micros end,
    'daily_call_limit', v_limit.daily_call_limit,
    'daily_token_limit', v_limit.daily_token_limit,
    'daily_cost_limit_micros', v_limit.daily_cost_limit_micros
  );
end;
$$;

create or replace function public.record_ai_runtime_event(
  p_user_id uuid,
  p_feature_key text,
  p_model_id text,
  p_prompt_version text,
  p_retrieval_version text,
  p_request_id uuid,
  p_status text,
  p_latency_ms integer default null,
  p_input_tokens integer default null,
  p_output_tokens integer default null,
  p_estimated_cost_micros bigint default null,
  p_retrieved_chunk_count integer default null,
  p_error_code text default null,
  p_metadata jsonb default '{}'
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;
  if p_status not in ('started', 'completed', 'failed', 'rate_limited') then
    raise exception 'invalid_ai_runtime_status' using errcode = '22023';
  end if;
  insert into public.ai_runtime_events (
    user_id, feature_key, model_id, prompt_version, retrieval_version,
    request_id, status, latency_ms, input_tokens, output_tokens,
    estimated_cost_micros, retrieved_chunk_count, error_code, metadata
  ) values (
    p_user_id, p_feature_key, p_model_id, p_prompt_version, p_retrieval_version,
    p_request_id, p_status, p_latency_ms, p_input_tokens, p_output_tokens,
    p_estimated_cost_micros, p_retrieved_chunk_count, p_error_code,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.consume_ai_budget(uuid, text, integer, bigint) from public;
revoke all on function public.record_ai_runtime_event(uuid, text, text, text, text, uuid, text, integer, integer, integer, bigint, integer, text, jsonb) from public;
grant execute on function public.consume_ai_budget(uuid, text, integer, bigint) to service_role;
grant execute on function public.record_ai_runtime_event(uuid, text, text, text, text, uuid, text, integer, integer, integer, bigint, integer, text, jsonb) to service_role;

comment on table public.ai_evaluation_results is 'Versioned evaluation results required before model or prompt promotion.';
comment on table public.ai_runtime_events is 'Operational AI telemetry without raw learner prompts or generated content.';
comment on function public.consume_ai_budget(uuid, text, integer, bigint) is 'Atomic service-role-only daily AI budget gate for calls, tokens, and estimated cost.';
