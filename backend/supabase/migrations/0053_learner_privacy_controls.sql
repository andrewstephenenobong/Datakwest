-- 0053_learner_privacy_controls.sql
-- Pilot privacy controls. This migration is local until explicitly approved for live application.

alter table public.learner_preferences
  add column if not exists personalization_consent boolean not null default true,
  add column if not exists ai_memory_consent boolean not null default false,
  add column if not exists analytics_consent boolean not null default false,
  add column if not exists consent_updated_at timestamptz not null default now();

create table if not exists public.learner_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references auth.users(id) on delete cascade,
  request_type text not null check (request_type in ('export', 'deletion')),
  status text not null default 'requested' check (status in ('requested', 'in_progress', 'completed', 'rejected', 'failed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object')
);

create index if not exists learner_privacy_requests_learner_idx
  on public.learner_privacy_requests(learner_id, requested_at desc);

alter table public.learner_privacy_requests enable row level security;

create policy "Learners can view their privacy requests"
  on public.learner_privacy_requests for select to authenticated
  using (auth.uid() = learner_id);

create or replace function public.get_privacy_preferences()
returns public.learner_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_preferences public.learner_preferences;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.learner_preferences (learner_id)
  values (v_user_id)
  on conflict (learner_id) do nothing;

  select * into v_preferences
  from public.learner_preferences
  where learner_id = v_user_id;

  return v_preferences;
end;
$$;

create or replace function public.update_privacy_preferences(
  p_personalization_consent boolean,
  p_ai_memory_consent boolean,
  p_analytics_consent boolean
)
returns public.learner_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_preferences public.learner_preferences;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  insert into public.learner_preferences (
    learner_id, personalization_consent, ai_memory_consent, analytics_consent, consent_updated_at
  ) values (
    v_user_id,
    coalesce(p_personalization_consent, false),
    coalesce(p_ai_memory_consent, false),
    coalesce(p_analytics_consent, false),
    now()
  )
  on conflict (learner_id) do update set
    personalization_consent = excluded.personalization_consent,
    ai_memory_consent = excluded.ai_memory_consent,
    analytics_consent = excluded.analytics_consent,
    consent_updated_at = now(),
    updated_at = now();

  select * into v_preferences
  from public.learner_preferences
  where learner_id = v_user_id;

  return v_preferences;
end;
$$;

create or replace function public.request_privacy_action(p_request_type text)
returns public.learner_privacy_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.learner_privacy_requests;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if p_request_type not in ('export', 'deletion') then
    raise exception 'invalid_privacy_request_type' using errcode = '22023';
  end if;

  insert into public.learner_privacy_requests (learner_id, request_type)
  values (v_user_id, p_request_type)
  returning * into v_request;

  return v_request;
end;
$$;

revoke all on function public.get_privacy_preferences() from public;
revoke all on function public.update_privacy_preferences(boolean, boolean, boolean) from public;
revoke all on function public.request_privacy_action(text) from public;
grant execute on function public.get_privacy_preferences() to authenticated;
grant execute on function public.update_privacy_preferences(boolean, boolean, boolean) to authenticated;
grant execute on function public.request_privacy_action(text) to authenticated;

comment on table public.learner_privacy_requests is 'Auditable learner export/deletion requests. Processing is server-side and must not be implied as complete by the client.';
comment on function public.update_privacy_preferences(boolean, boolean, boolean) is 'Authenticated learner consent control. It changes future processing preferences; it does not retroactively delete data.';
