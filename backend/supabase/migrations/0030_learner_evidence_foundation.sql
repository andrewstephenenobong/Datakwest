-- DataKwest Universal Skill Intelligence Foundation: learner evidence and mastery projections.
-- Evidence is immutable from the client perspective; trusted RPCs will be added next.

create table if not exists public.learner_skill_enrolments (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete restrict,
  skill_graph_version_id uuid references public.skill_graph_versions(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived')),
  source text not null default 'learner_selected',
  target_outcome text not null default '',
  weekly_minutes integer check (weekly_minutes is null or weekly_minutes between 15 and 10080),
  locale text not null default 'en',
  age_band text not null default '13_plus',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists learner_active_skill_enrolment_key
  on public.learner_skill_enrolments(learner_id, skill_id)
  where status = 'active';

create table if not exists public.learner_evidence (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  enrolment_id uuid not null references public.learner_skill_enrolments(id) on delete cascade,
  skill_graph_node_id uuid references public.skill_graph_nodes(id) on delete set null,
  learning_object_version_id uuid references public.learning_object_versions(id) on delete set null,
  evidence_kind text not null check (evidence_kind in ('diagnostic', 'quiz', 'practice', 'explanation', 'project', 'simulation', 'peer_review', 'interview', 'reflection')),
  status text not null default 'submitted' check (status in ('submitted', 'processing', 'verified', 'needs_revision', 'rejected', 'withdrawn')),
  attempt_no integer not null default 1 check (attempt_no > 0),
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  server_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(server_metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique(learner_id, learning_object_version_id, attempt_no)
);

create table if not exists public.evidence_attempts (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null unique references public.learner_evidence(id) on delete cascade,
  response jsonb not null default '{}'::jsonb check (jsonb_typeof(response) = 'object'),
  score numeric(8,3),
  max_score numeric(8,3),
  correctness numeric(6,5) check (correctness is null or correctness between 0 and 1),
  hints_used integer not null default 0 check (hints_used >= 0),
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  verifier_version text,
  verifier_confidence numeric(6,5) check (verifier_confidence is null or verifier_confidence between 0 and 1),
  misconception_codes text[] not null default '{}',
  feedback jsonb not null default '{}'::jsonb check (jsonb_typeof(feedback) = 'object'),
  created_at timestamptz not null default now()
);

create table if not exists public.evidence_artifacts (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references public.learner_evidence(id) on delete cascade,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  content_hash text,
  extracted_features jsonb not null default '{}'::jsonb check (jsonb_typeof(extracted_features) = 'object'),
  moderation_status text not null default 'processing' check (moderation_status in ('processing', 'approved', 'rejected', 'quarantined', 'withdrawn')),
  created_at timestamptz not null default now()
);

create table if not exists public.learner_node_mastery (
  learner_id uuid not null references auth.users(id) on delete cascade,
  skill_graph_version_id uuid not null references public.skill_graph_versions(id) on delete cascade,
  skill_graph_node_id uuid not null references public.skill_graph_nodes(id) on delete cascade,
  mastery_score numeric(6,5) not null default 0 check (mastery_score between 0 and 1),
  confidence_score numeric(6,5) not null default 0 check (confidence_score between 0 and 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  last_evidence_at timestamptz,
  next_review_at timestamptz,
  misconception_codes text[] not null default '{}',
  model_version text not null,
  computed_at timestamptz not null default now(),
  primary key(learner_id, skill_graph_version_id, skill_graph_node_id)
);

create table if not exists public.learner_skill_state (
  learner_id uuid not null references auth.users(id) on delete cascade,
  skill_graph_version_id uuid not null references public.skill_graph_versions(id) on delete cascade,
  readiness_score numeric(6,5) not null default 0 check (readiness_score between 0 and 1),
  coverage_score numeric(6,5) not null default 0 check (coverage_score between 0 and 1),
  evidence_count integer not null default 0 check (evidence_count >= 0),
  recommended_node_id uuid references public.skill_graph_nodes(id) on delete set null,
  recommendation_reason jsonb not null default '{}'::jsonb check (jsonb_typeof(recommendation_reason) = 'object'),
  model_version text not null,
  computed_at timestamptz not null default now(),
  primary key(learner_id, skill_graph_version_id)
);

create table if not exists public.learner_preferences (
  learner_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en',
  timezone text,
  weekly_minutes integer check (weekly_minutes is null or weekly_minutes between 15 and 10080),
  preferred_modalities text[] not null default '{}',
  accessibility jsonb not null default '{}'::jsonb check (jsonb_typeof(accessibility) = 'object'),
  explanation_style text,
  age_band text not null default '13_plus',
  guardian_controlled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.learner_interaction_events (
  id bigint generated always as identity primary key,
  learner_id uuid references auth.users(id) on delete set null,
  session_id uuid,
  event_name text not null,
  skill_id uuid references public.skills(id) on delete set null,
  skill_graph_node_id uuid references public.skill_graph_nodes(id) on delete set null,
  learning_object_version_id uuid references public.learning_object_versions(id) on delete set null,
  event_value jsonb not null default '{}'::jsonb check (jsonb_typeof(event_value) = 'object'),
  consent_scope text not null default 'personalization',
  created_at timestamptz not null default now()
);

create index if not exists learner_enrolments_learner_status_idx
  on public.learner_skill_enrolments(learner_id, status, updated_at desc);
create index if not exists learner_evidence_learner_time_idx
  on public.learner_evidence(learner_id, submitted_at desc);
create index if not exists learner_evidence_node_idx
  on public.learner_evidence(learner_id, skill_graph_node_id, status);
create index if not exists learner_mastery_review_idx
  on public.learner_node_mastery(learner_id, next_review_at)
  where next_review_at is not null;
create index if not exists learner_events_training_idx
  on public.learner_interaction_events(event_name, created_at desc);

alter table public.learner_skill_enrolments enable row level security;
alter table public.learner_evidence enable row level security;
alter table public.evidence_attempts enable row level security;
alter table public.evidence_artifacts enable row level security;
alter table public.learner_node_mastery enable row level security;
alter table public.learner_skill_state enable row level security;
alter table public.learner_preferences enable row level security;
alter table public.learner_interaction_events enable row level security;

create policy "Users can view own skill enrolments"
  on public.learner_skill_enrolments for select to authenticated
  using (auth.uid() = learner_id);
create policy "Users can view own evidence"
  on public.learner_evidence for select to authenticated
  using (auth.uid() = learner_id);
create policy "Users can view own evidence attempts"
  on public.evidence_attempts for select to authenticated
  using (exists (
    select 1 from public.learner_evidence e
    where e.id = evidence_attempts.evidence_id and e.learner_id = auth.uid()
  ));
create policy "Users can view own evidence artifacts"
  on public.evidence_artifacts for select to authenticated
  using (exists (
    select 1 from public.learner_evidence e
    where e.id = evidence_artifacts.evidence_id and e.learner_id = auth.uid()
  ));
create policy "Users can view own node mastery"
  on public.learner_node_mastery for select to authenticated
  using (auth.uid() = learner_id);
create policy "Users can view own skill state"
  on public.learner_skill_state for select to authenticated
  using (auth.uid() = learner_id);
create policy "Users can view own preferences"
  on public.learner_preferences for select to authenticated
  using (auth.uid() = learner_id);

comment on table public.learner_evidence is 'Immutable learner proof ledger; client writes are blocked and trusted RPCs create records.';
comment on table public.learner_node_mastery is 'Server-computed mastery projection derived from evidence and a named model version.';
comment on table public.learner_skill_state is 'Server-computed skill readiness and next-action projection.';
comment on table public.learner_interaction_events is 'Consent-scoped, privacy-minimised signals for analytics and personalization.';
