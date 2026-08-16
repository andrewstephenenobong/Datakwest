-- Server-authoritative onboarding completion.
-- The browser may request completion, but it cannot write arbitrary profile rows directly.

create or replace function public.complete_onboarding(
  p_email text,
  p_full_name text,
  p_username text,
  p_assessment jsonb,
  p_roadmap jsonb
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
        onboarding_completed = true,
        updated_at = now()
  returning * into v_profile;

  return jsonb_build_object(
    'id', v_profile.id,
    'onboarding_completed', v_profile.onboarding_completed,
    'updated_at', v_profile.updated_at
  );
end;
$$;

revoke all on function public.complete_onboarding(text, text, text, jsonb, jsonb) from public;
grant execute on function public.complete_onboarding(text, text, text, jsonb, jsonb) to authenticated;

comment on function public.complete_onboarding(text, text, text, jsonb, jsonb) is 'Authenticated onboarding completion boundary; writes only the caller profile and returns safe status metadata.';
