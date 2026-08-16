-- 0063_playground_matchmaking_fairness.sql
-- Preserve queue order during polling; repeated client checks must not refresh queued_at.

create or replace function public.find_playground_match(p_game_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_pref public.learner_preferences;
  v_opponent public.playground_matchmaking_queue;
  v_room public.playground_rooms;
  v_state jsonb;
  v_age_band text;
  v_guardian_controlled boolean;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_game_key not in ('tic_tac_toe', 'memory_cards') then raise exception 'matchmaking_not_available_for_game' using errcode = '22023'; end if;

  select * into v_pref from public.learner_preferences where learner_id = v_user_id;
  v_age_band := coalesce(v_pref.age_band, '13_plus');
  v_guardian_controlled := coalesce(v_pref.guardian_controlled, false);

  perform pg_advisory_xact_lock(hashtext('datakwest_playground:' || p_game_key || ':' || v_age_band || ':' || v_guardian_controlled::text));
  delete from public.playground_matchmaking_queue where expires_at <= now();

  if not exists (
    select 1 from public.playground_matchmaking_queue
    where user_id = v_user_id and game_key = p_game_key and expires_at > now()
  ) then
    insert into public.playground_matchmaking_queue(user_id, game_key, age_band, guardian_controlled)
    values (v_user_id, p_game_key, v_age_band, v_guardian_controlled)
    on conflict (user_id) do update set game_key = excluded.game_key, age_band = excluded.age_band, guardian_controlled = excluded.guardian_controlled, queued_at = now(), expires_at = now() + interval '10 minutes';
  end if;

  select * into v_opponent
  from public.playground_matchmaking_queue
  where user_id <> v_user_id
    and game_key = p_game_key
    and age_band = v_age_band
    and guardian_controlled = v_guardian_controlled
    and expires_at > now()
  order by queued_at, user_id
  limit 1
  for update skip locked;

  if not found then
    return jsonb_build_object('matched', false, 'queued', true, 'game_key', p_game_key);
  end if;

  v_state := public.playground_initial_state(p_game_key, v_user_id, v_opponent.user_id);
  insert into public.playground_rooms(game_key, visibility, status, host_id, age_band, guardian_controlled, max_players, state)
  values (p_game_key, 'matchmaking', 'active', v_user_id, v_age_band, v_guardian_controlled, 2, v_state)
  returning * into v_room;

  insert into public.playground_room_members(room_id, user_id, seat_no) values (v_room.id, v_user_id, 1), (v_room.id, v_opponent.user_id, 2);
  delete from public.playground_matchmaking_queue where user_id in (v_user_id, v_opponent.user_id);

  return jsonb_build_object('matched', true, 'queued', false, 'room_id', v_room.id, 'game_key', p_game_key, 'status', v_room.status);
end;
$$;

revoke all on function public.find_playground_match(text) from public;
grant execute on function public.find_playground_match(text) to authenticated;

comment on function public.find_playground_match(text) is 'Fair age-scoped matchmaking. Polling preserves queued_at until a match is created or the queue expires.';
