-- Fix the live onboarding RPC for the deployed profiles schema.
-- public.profiles does not expose updated_at; learner_preferences does.
-- Keep the write atomic and server-authoritative without changing the client contract.

create or replace function public.complete_onboarding_with_preferences(
  p_email text,
  p_full_name text,
  p_username text,
  p_assessment jsonb,
  p_roadmap jsonb,
  p_age_band text default '13_plus',
  p_guardian_controlled boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
begin
  if v_user_id is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_age_band not in ('under_6', '6_12', '13_plus', 'adult') then
    raise exception 'invalid_age_band' using errcode = '22023';
  end if;

  if coalesce(p_guardian_controlled, false) and p_age_band not in ('under_6', '6_12') then
    raise exception 'guardian_controlled_requires_under_13_age_band' using errcode = '22023';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    username,
    assessment,
    roadmap,
    onboarding_completed
  )
  values (
    v_user_id,
    nullif(trim(p_email), ''),
    nullif(trim(p_full_name), ''),
    nullif(trim(p_username), ''),
    coalesce(p_assessment, '{}'::jsonb),
    coalesce(p_roadmap, '{}'::jsonb),
    true
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name,
        username = excluded.username,
        assessment = excluded.assessment,
        roadmap = excluded.roadmap,
        onboarding_completed = true
  returning * into v_profile;

  insert into public.learner_preferences (
    learner_id,
    age_band,
    guardian_controlled,
    updated_at
  )
  values (
    v_user_id,
    p_age_band,
    coalesce(p_guardian_controlled, false),
    now()
  )
  on conflict (learner_id) do update
    set age_band = excluded.age_band,
        guardian_controlled = excluded.guardian_controlled,
        updated_at = now();

  return jsonb_build_object(
    'id', v_profile.id,
    'onboarding_completed', v_profile.onboarding_completed,
    'age_band', p_age_band,
    'guardian_controlled', coalesce(p_guardian_controlled, false)
  );
end;
$$;

revoke all on function public.complete_onboarding_with_preferences(text, text, text, jsonb, jsonb, text, boolean) from public;
grant execute on function public.complete_onboarding_with_preferences(text, text, text, jsonb, jsonb, text, boolean) to authenticated;

comment on function public.complete_onboarding_with_preferences(text, text, text, jsonb, jsonb, text, boolean) is 'Authenticated onboarding boundary; atomically writes the caller profile and age-aware learner preference state without assuming a profiles.updated_at column.';

-- Verification note: this migration deliberately does not alter the profiles table.
-- The deployed schema is the source of truth for profile columns.
