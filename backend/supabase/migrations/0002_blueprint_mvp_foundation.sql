-- DataKwest blueprint-aligned MVP foundation.
-- This migration defines secure domain contracts and later-phase extension points.
-- It is intentionally not applied automatically to the production Supabase project.
-- Apply only after owner review, staging validation, and a rollback plan.

create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  kind text not null default 'community' check (kind in ('community', 'school', 'enterprise', 'employer', 'internal')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organisation_members (
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'instructor', 'reviewer', 'recruiter', 'member')),
  created_at timestamptz not null default now(),
  primary key (organisation_id, user_id)
);

create table if not exists public.career_paths (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  version integer not null default 1 check (version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid not null references public.career_paths(id) on delete cascade,
  slug text not null,
  title text not null,
  description text not null default '',
  level text not null default 'foundation' check (level in ('foundation', 'intermediate', 'advanced', 'applied')),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  rubric_version integer not null default 1 check (rubric_version > 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (career_path_id, slug)
);

create table if not exists public.concept_nodes (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  slug text not null,
  title text not null,
  node_type text not null default 'concept' check (node_type in ('concept', 'exercise', 'assessment', 'project', 'mastery')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (skill_id, slug)
);

create table if not exists public.skill_prerequisites (
  skill_id uuid not null references public.skills(id) on delete cascade,
  prerequisite_skill_id uuid not null references public.skills(id) on delete cascade,
  relationship text not null default 'prerequisite' check (relationship in ('prerequisite', 'related_to', 'applied_in')),
  created_at timestamptz not null default now(),
  primary key (skill_id, prerequisite_skill_id),
  check (skill_id <> prerequisite_skill_id)
);

create table if not exists public.content_lessons (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  concept_node_id uuid references public.concept_nodes(id) on delete set null,
  title text not null,
  objective text not null default '',
  content jsonb not null default '{}'::jsonb,
  prompt_version text,
  model_id text,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  version integer not null default 1 check (version > 0),
  author_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.content_lessons(id) on delete cascade,
  kind text not null check (kind in ('practice', 'challenge', 'reflection', 'project', 'interview')),
  prompt jsonb not null default '{}'::jsonb,
  rubric jsonb not null default '{}'::jsonb,
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid references public.career_paths(id) on delete cascade,
  skill_id uuid references public.skills(id) on delete cascade,
  title text not null,
  rubric jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid references public.assessments(id) on delete set null,
  exercise_id uuid references public.exercises(id) on delete set null,
  answer jsonb not null default '{}'::jsonb,
  score numeric(5,2),
  feedback jsonb not null default '{}'::jsonb,
  duration_seconds integer check (duration_seconds is null or duration_seconds >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.practice_items (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  prompt jsonb not null default '{}'::jsonb,
  answer jsonb not null default '{}'::jsonb,
  difficulty integer not null default 1 check (difficulty between 1 and 5),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  career_path_id uuid references public.career_paths(id) on delete set null,
  mission_date date not null default current_date,
  mission_type text not null check (mission_type in ('learn', 'practice', 'review', 'project', 'reflection', 'interview')),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'assigned' check (status in ('assigned', 'started', 'completed', 'skipped')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, mission_date, mission_type)
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  career_path_id uuid references public.career_paths(id) on delete set null,
  skill_id uuid references public.skills(id) on delete set null,
  title text not null,
  brief text not null default '',
  rubric jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'review', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  evidence jsonb not null default '{}'::jsonb,
  reflection text not null default '',
  ai_score numeric(5,2),
  ai_feedback jsonb not null default '{}'::jsonb,
  visibility text not null default 'private' check (visibility in ('private', 'public', 'recruiter_shared')),
  status text not null default 'submitted' check (status in ('draft', 'submitted', 'in_review', 'reviewed', 'published', 'withdrawn')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reviewer_id uuid references auth.users(id) on delete set null,
  review_type text not null check (review_type in ('ai', 'human', 'moderation')),
  rubric_version integer not null default 1,
  score numeric(5,2),
  feedback jsonb not null default '{}'::jsonb,
  status text not null default 'completed' check (status in ('pending', 'completed', 'disputed', 'retracted')),
  created_at timestamptz not null default now()
);

create table if not exists public.portfolios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  slug text not null unique,
  headline text not null default '',
  bio text not null default '',
  resume_url text,
  public_enabled boolean not null default false,
  visibility_settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  career_path_id uuid references public.career_paths(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  certificate_number text not null unique,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'issued', 'revoked')),
  issued_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('tutor', 'mentor', 'practice', 'interview', 'career_coach', 'project_reviewer')),
  title text not null default '',
  context_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'reviewer')),
  content jsonb not null default '{}'::jsonb,
  model_id text,
  prompt_version text,
  safety_state text not null default 'not_reviewed' check (safety_state in ('not_reviewed', 'safe', 'blocked', 'escalated')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_contexts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  context_type text not null check (context_type in ('profile', 'skill_state', 'mission', 'portfolio', 'career')),
  version integer not null default 1,
  source_hash text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, context_type, version)
);

create table if not exists public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  amount integer not null check (amount <> 0),
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  criteria jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  primary key (user_id, badge_id)
);

create table if not exists public.streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_count integer not null default 0 check (current_count >= 0),
  longest_count integer not null default 0 check (longest_count >= 0),
  last_active_date date,
  rest_days jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  challenge_type text not null check (challenge_type in ('weekly', 'monthly', 'seasonal', 'battle', 'adventure', 'simulation')),
  starts_at timestamptz,
  ends_at timestamptz,
  rules jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'closed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  visibility text not null default 'private' check (visibility in ('private', 'public', 'organisation')),
  status text not null default 'planned' check (status in ('planned', 'active', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  name text not null,
  moderation_policy jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid references public.organisations(id) on delete set null,
  title text not null,
  description text not null default '',
  opportunity_type text not null check (opportunity_type in ('job', 'internship', 'freelance', 'project')),
  requirements jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted', 'reviewing', 'shortlisted', 'rejected', 'accepted', 'withdrawn')),
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, user_id)
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  provider text not null,
  provider_customer_id text,
  provider_subscription_id text,
  status text not null default 'pending' check (status in ('pending', 'active', 'past_due', 'canceled', 'expired')),
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (user_id is not null or organisation_id is not null)
);

create table if not exists public.entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organisation_id uuid references public.organisations(id) on delete cascade,
  entitlement_key text not null,
  source text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (user_id is not null or organisation_id is not null)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  notification_type text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  organisation_id uuid references public.organisations(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.experiments (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null default '',
  config jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null default '',
  enabled boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_feature_flags (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_flag_id uuid not null references public.feature_flags(id) on delete cascade,
  enabled boolean not null,
  reason text not null default '',
  created_at timestamptz not null default now(),
  primary key (user_id, feature_flag_id)
);

create table if not exists public.readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score numeric(5,2) not null check (score between 0 and 100),
  factors jsonb not null default '{}'::jsonb,
  rubric_version integer not null default 1,
  source_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_name text not null,
  event_version integer not null default 1,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

-- Every new table is protected by RLS. Privileged writes must use trusted server paths.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organisations', 'organisation_members', 'career_paths', 'skills', 'concept_nodes',
    'skill_prerequisites', 'content_lessons', 'exercises', 'assessments', 'attempts',
    'practice_items', 'missions', 'projects', 'submissions', 'reviews', 'portfolios',
    'certificates', 'conversations', 'messages', 'ai_contexts', 'xp_events', 'badges',
    'user_badges', 'streaks', 'challenges', 'communities', 'groups', 'opportunities',
    'applications', 'subscriptions', 'entitlements', 'notifications', 'audit_events',
    'experiments', 'feature_flags', 'user_feature_flags', 'readiness_snapshots', 'analytics_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end $$;

-- Learners can read their own private records and write only low-risk events through the client.
create policy "Users can view own attempts" on public.attempts for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own attempts" on public.attempts for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can view own missions" on public.missions for select to authenticated using (auth.uid() = user_id);
create policy "Users can update own mission state" on public.missions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can view own submissions" on public.submissions for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own submissions" on public.submissions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can update own draft submissions" on public.submissions for update to authenticated using (auth.uid() = user_id and status = 'draft') with check (auth.uid() = user_id);
create policy "Users can view own portfolio" on public.portfolios for select to authenticated using (auth.uid() = user_id);
create policy "Users can manage own portfolio" on public.portfolios for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can view own conversations" on public.conversations for select to authenticated using (auth.uid() = user_id);
create policy "Users can create own conversations" on public.conversations for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can view own messages" on public.messages for select to authenticated using (auth.uid() = user_id);
create policy "Users can create own messages" on public.messages for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can view own notifications" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "Users can update own notifications" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can view own readiness" on public.readiness_snapshots for select to authenticated using (auth.uid() = user_id);
create policy "Users can view own analytics" on public.analytics_events for select to authenticated using (auth.uid() = user_id);
create policy "Users can insert own analytics" on public.analytics_events for insert to authenticated with check (auth.uid() = user_id);

-- Public content is readable only after publication. Authoring and privileged mutations remain server/admin-only.
create policy "Authenticated users can view published career paths" on public.career_paths for select to authenticated using (status = 'published');
create policy "Authenticated users can view published skills" on public.skills for select to authenticated using (status = 'published');
create policy "Authenticated users can view published lessons" on public.content_lessons for select to authenticated using (status = 'published');
create policy "Authenticated users can view published exercises" on public.exercises for select to authenticated using (status = 'published');
create policy "Authenticated users can view published projects" on public.projects for select to authenticated using (status = 'published');
create policy "Authenticated users can view public portfolios" on public.portfolios for select to authenticated using (public_enabled = true);

-- Server-side service-role paths must write XP, readiness, AI usage, credentials, reviews, billing,
-- organisation administration, and feature configuration. No client policy is granted for these tables.
