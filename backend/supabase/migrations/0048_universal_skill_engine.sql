-- Universal Skill Engine: learner-selected subjects and governed curriculum generation.
-- Generated skills remain draft/review/pilot until validation and publication gates pass.

insert into public.career_paths (slug, title, description, status, version, metadata)
values ('universal-discovery', 'Universal Skill Discovery', 'Learner-selected subjects generated through governed discovery and validation.', 'published', 1, '{"system_owned":true}'::jsonb)
on conflict (slug) do update set title = excluded.title, description = excluded.description, metadata = excluded.metadata, updated_at = now();

create table if not exists public.universal_skill_requests (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  requested_skill text not null check (length(trim(requested_skill)) between 2 and 160),
  normalized_skill text,
  canonical_slug text,
  goal text not null default '' check (length(goal) <= 1000),
  current_level text not null default 'beginner' check (current_level in ('beginner', 'early', 'intermediate', 'advanced', 'unknown')),
  weekly_minutes integer check (weekly_minutes is null or weekly_minutes between 15 and 10080),
  locale text not null default 'en',
  target_age_min smallint check (target_age_min is null or target_age_min >= 0),
  target_age_max smallint check (target_age_max is null or target_age_max >= target_age_min),
  status text not null default 'requested' check (status in ('requested', 'resolving', 'generating', 'review', 'pilot', 'published', 'rejected', 'failed')),
  skill_id uuid references public.skills(id) on delete set null,
  skill_graph_version_id uuid references public.skill_graph_versions(id) on delete set null,
  confidence numeric(5,4) check (confidence is null or confidence between 0 and 1),
  failure_code text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.universal_skill_generation_runs (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.universal_skill_requests(id) on delete cascade,
  run_no integer not null check (run_no > 0),
  status text not null check (status in ('started', 'completed', 'rejected', 'failed')),
  model_id text not null default '',
  prompt_version text not null default '',
  input_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(input_snapshot) = 'object'),
  output_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(output_snapshot) = 'object'),
  validation_report jsonb not null default '{}'::jsonb check (jsonb_typeof(validation_report) = 'object'),
  error_code text,
  input_tokens integer,
  output_tokens integer,
  created_at timestamptz not null default now(),
  unique(request_id, run_no)
);

create index if not exists universal_skill_requests_learner_idx on public.universal_skill_requests(learner_id, created_at desc);
create index if not exists universal_skill_requests_status_idx on public.universal_skill_requests(status, updated_at desc);
create index if not exists universal_skill_runs_request_idx on public.universal_skill_generation_runs(request_id, run_no desc);

alter table public.universal_skill_requests enable row level security;
alter table public.universal_skill_generation_runs enable row level security;

create policy "Learners can view own universal skill requests"
  on public.universal_skill_requests for select to authenticated
  using (auth.uid() = learner_id);
create policy "Learners can view own universal skill generation runs"
  on public.universal_skill_generation_runs for select to authenticated
  using (exists (select 1 from public.universal_skill_requests r where r.id = request_id and r.learner_id = auth.uid()));

create or replace function public.create_universal_skill_request(
  p_requested_skill text,
  p_goal text default '',
  p_current_level text default 'beginner',
  p_weekly_minutes integer default null,
  p_locale text default 'en',
  p_target_age_min smallint default null,
  p_target_age_max smallint default null
)
returns public.universal_skill_requests
language plpgsql
security definer
set search_path = public
as $$
declare result_row public.universal_skill_requests;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if length(trim(coalesce(p_requested_skill, ''))) < 2 then raise exception 'requested_skill_invalid'; end if;
  insert into public.universal_skill_requests (learner_id, requested_skill, goal, current_level, weekly_minutes, locale, target_age_min, target_age_max)
  values (auth.uid(), trim(p_requested_skill), coalesce(p_goal, ''), coalesce(p_current_level, 'beginner'), p_weekly_minutes, coalesce(nullif(trim(p_locale), ''), 'en'), p_target_age_min, p_target_age_max)
  returning * into result_row;
  return result_row;
end;
$$;

create or replace function public.get_universal_skill_request(p_request_id uuid)
returns table (
  id uuid,
  requested_skill text,
  normalized_skill text,
  canonical_slug text,
  goal text,
  current_level text,
  weekly_minutes integer,
  locale text,
  status text,
  skill_id uuid,
  skill_graph_version_id uuid,
  confidence numeric,
  metadata jsonb,
  latest_run jsonb,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select r.id, r.requested_skill, r.normalized_skill, r.canonical_slug, r.goal, r.current_level, r.weekly_minutes, r.locale, r.status, r.skill_id, r.skill_graph_version_id, r.confidence, r.metadata,
    coalesce((select jsonb_build_object('id', g.id, 'status', g.status, 'model_id', g.model_id, 'validation_report', g.validation_report, 'created_at', g.created_at) from public.universal_skill_generation_runs g where g.request_id = r.id order by g.run_no desc limit 1), '{}'::jsonb),
    r.created_at, r.updated_at
  from public.universal_skill_requests r
  where r.id = p_request_id and r.learner_id = auth.uid();
$$;

create or replace function public.validate_universal_skill_graph(p_skill_graph_version_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare node_count integer; edge_count integer; prerequisite_count integer; has_outcome boolean; report jsonb;
begin
  select count(*) into node_count from public.skill_graph_nodes where skill_graph_version_id = p_skill_graph_version_id;
  select count(*), count(*) filter (where edge_type = 'prerequisite') into edge_count, prerequisite_count from public.skill_graph_edges where skill_graph_version_id = p_skill_graph_version_id;
  select exists(select 1 from public.skill_graph_nodes where skill_graph_version_id = p_skill_graph_version_id and node_type in ('career_outcome', 'assessment', 'project')) into has_outcome;
  report := jsonb_build_object(
    'valid', node_count >= 4 and edge_count >= 1 and prerequisite_count >= 1 and has_outcome,
    'node_count', node_count,
    'edge_count', edge_count,
    'prerequisite_edge_count', prerequisite_count,
    'has_outcome_or_assessment', has_outcome,
    'rules', jsonb_build_object('minimum_nodes', 4, 'minimum_edges', 1, 'requires_prerequisite', true, 'requires_outcome_or_assessment', true)
  );
  return report;
end;
$$;

revoke all on function public.create_universal_skill_request(text, text, text, integer, text, smallint, smallint) from public;
grant execute on function public.create_universal_skill_request(text, text, text, integer, text, smallint, smallint) to authenticated;
revoke all on function public.get_universal_skill_request(uuid) from public;
grant execute on function public.get_universal_skill_request(uuid) to authenticated;
revoke all on function public.validate_universal_skill_graph(uuid) from public;
grant execute on function public.validate_universal_skill_graph(uuid) to service_role;

grant select on public.universal_skill_requests, public.universal_skill_generation_runs to authenticated;
grant select, insert, update on public.universal_skill_requests, public.universal_skill_generation_runs to service_role;
