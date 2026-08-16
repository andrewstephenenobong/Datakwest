-- 0060_playground_authoritative_multiplayer.sql
-- Server-authoritative game validation and safe matchmaking for Playground online play.
-- Clients submit intents; this migration validates the legal move, computes state,
-- settles the result, and exposes only bounded room snapshots.

create or replace function public.playground_initial_state(
  p_game_key text,
  p_host_id uuid,
  p_guest_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_deck jsonb;
begin
  if p_game_key = 'tic_tac_toe' then
    return jsonb_build_object(
      'version', 1,
      'board', jsonb_build_array(null, null, null, null, null, null, null, null, null),
      'players', jsonb_build_object(p_host_id::text, 'X', p_guest_id::text, 'O'),
      'next_symbol', 'X',
      'winner', null,
      'moves', 0
    );
  end if;

  if p_game_key = 'memory_cards' then
    select jsonb_agg(to_jsonb(value) order by random()) into v_deck
    from unnest(array['owl','owl','star','star','moon','moon','bolt','bolt']) as item(value);
    return jsonb_build_object(
      'version', 1,
      'deck', v_deck,
      'players', jsonb_build_array(p_host_id, p_guest_id),
      'turn_user_id', p_host_id,
      'revealed', jsonb_build_array(),
      'matched', jsonb_build_array(),
      'scores', jsonb_build_object(p_host_id::text, 0, p_guest_id::text, 0),
      'winner', null
    );
  end if;

  raise exception 'unsupported_online_game' using errcode = '22023';
end;
$$;

create or replace function public.playground_tic_winner(p_board jsonb)
returns text
language plpgsql
immutable
security definer
set search_path = public, pg_catalog
as $$
declare
  v_line record;
  v_first text;
  v_second text;
  v_third text;
  v_filled integer := 0;
begin
  for v_line in select * from (values
    (0,1,2), (3,4,5), (6,7,8), (0,3,6),
    (1,4,7), (2,5,8), (0,4,8), (2,4,6)
  ) as lines(a,b,c) loop
    v_first := p_board->>v_line.a;
    v_second := p_board->>v_line.b;
    v_third := p_board->>v_line.c;
    if v_first is not null and v_first = v_second and v_second = v_third then
      return v_first;
    end if;
  end loop;

  for v_line in select * from generate_series(0, 8) as cells(index) loop
    if p_board->>v_line.index is not null then v_filled := v_filled + 1; end if;
  end loop;
  if v_filled = 9 then return 'draw'; end if;
  return null;
end;
$$;

create or replace function public.playground_room_snapshot(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.playground_rooms;
  v_members jsonb;
  v_is_member boolean;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into v_room from public.playground_rooms where id = p_room_id and expires_at > now();
  if not found then raise exception 'room_unavailable' using errcode = '22023'; end if;
  select exists(select 1 from public.playground_room_members where room_id = p_room_id and user_id = v_user_id and status in ('joined','disconnected')) into v_is_member;
  if not v_is_member then raise exception 'not_room_member' using errcode = '42501'; end if;

  select coalesce(jsonb_agg(jsonb_build_object('seat_no', seat_no, 'status', status, 'is_you', user_id = v_user_id) order by seat_no), '[]'::jsonb)
    into v_members
  from public.playground_room_members
  where room_id = p_room_id and status <> 'left';

  return jsonb_build_object(
    'room_id', v_room.id,
    'game_key', v_room.game_key,
    'status', v_room.status,
    'visibility', v_room.visibility,
    'turn_no', v_room.turn_no,
    'state', v_room.state,
    'members', v_members,
    'expires_at', v_room.expires_at
  );
end;
$$;

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
  insert into public.playground_matchmaking_queue(user_id, game_key, age_band, guardian_controlled)
  values (v_user_id, p_game_key, v_age_band, v_guardian_controlled)
  on conflict (user_id) do update set game_key = excluded.game_key, age_band = excluded.age_band, guardian_controlled = excluded.guardian_controlled, queued_at = now(), expires_at = now() + interval '10 minutes';

  select * into v_opponent
  from public.playground_matchmaking_queue
  where user_id <> v_user_id
    and game_key = p_game_key
    and age_band = v_age_band
    and guardian_controlled = v_guardian_controlled
    and expires_at > now()
  order by queued_at
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

create or replace function public.join_playground_room(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.playground_rooms;
  v_pref public.learner_preferences;
  v_seat integer;
  v_state jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into v_room from public.playground_rooms where invite_code = upper(trim(p_invite_code)) and status = 'waiting' and expires_at > now() for update;
  if not found then raise exception 'room_unavailable' using errcode = '22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id = v_user_id;
  if coalesce(v_pref.age_band, '13_plus') <> v_room.age_band or coalesce(v_pref.guardian_controlled, false) <> v_room.guardian_controlled then raise exception 'room_age_scope_mismatch' using errcode = '42501'; end if;
  if exists (select 1 from public.playground_room_members where room_id = v_room.id and user_id = v_user_id and status <> 'left') then raise exception 'already_in_room' using errcode = '23505'; end if;
  select coalesce(max(seat_no), 0) + 1 into v_seat from public.playground_room_members where room_id = v_room.id and status <> 'left';
  if v_seat > v_room.max_players then raise exception 'room_full' using errcode = '22023'; end if;
  insert into public.playground_room_members(room_id, user_id, seat_no) values (v_room.id, v_user_id, v_seat);
  if v_seat >= 2 then
    v_state := public.playground_initial_state(v_room.game_key, v_room.host_id, v_user_id);
    update public.playground_rooms set status = 'active', state = v_state where id = v_room.id;
  end if;
  return jsonb_build_object('room_id', v_room.id, 'game_key', v_room.game_key, 'status', case when v_seat >= 2 then 'active' else v_room.status end, 'seat_no', v_seat);
end;
$$;

create or replace function public.submit_playground_intent(p_room_id uuid, p_action jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_room public.playground_rooms;
  v_member public.playground_room_members;
  v_intent public.playground_game_intents;
  v_state jsonb;
  v_board jsonb;
  v_winner text;
  v_index integer;
  v_symbol text;
  v_actor text;
  v_players jsonb;
  v_revealed jsonb;
  v_matched jsonb;
  v_deck jsonb;
  v_scores jsonb;
  v_turn_user uuid;
  v_other_user uuid;
  v_first_index integer;
  v_second_index integer;
  v_next_state jsonb;
  v_status text;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_action is null or jsonb_typeof(p_action) <> 'object' or octet_length(p_action::text) > 4000 then raise exception 'invalid_game_action' using errcode = '22023'; end if;

  select * into v_room from public.playground_rooms where id = p_room_id and status = 'active' and expires_at > now() for update;
  if not found then raise exception 'room_not_active' using errcode = '22023'; end if;
  select * into v_member from public.playground_room_members where room_id = p_room_id and user_id = v_user_id and status in ('joined','disconnected');
  if not found then raise exception 'not_room_member' using errcode = '42501'; end if;
  if v_member.status = 'disconnected' then update public.playground_room_members set status = 'joined', last_seen_at = now() where room_id = p_room_id and user_id = v_user_id; end if;

  v_state := v_room.state;
  v_status := 'active';

  if v_room.game_key = 'tic_tac_toe' then
    if coalesce(p_action->>'type', '') <> 'place' then raise exception 'invalid_tic_action' using errcode = '22023'; end if;
    v_index := nullif(p_action->>'index', '')::integer;
    if v_index is null or v_index < 0 or v_index > 8 then raise exception 'invalid_tic_cell' using errcode = '22023'; end if;
    v_symbol := case when v_member.seat_no = 1 then 'X' else 'O' end;
    if v_state->>'next_symbol' <> v_symbol then raise exception 'not_your_turn' using errcode = '42501'; end if;
    v_board := v_state->'board';
    if v_board->v_index is not null and v_board->v_index <> 'null'::jsonb then raise exception 'cell_already_taken' using errcode = '22023'; end if;
    v_board := jsonb_set(v_board, array[v_index::text], to_jsonb(v_symbol), false);
    v_winner := public.playground_tic_winner(v_board);
    v_next_state := jsonb_set(v_state, '{board}', v_board, true);
    v_next_state := jsonb_set(v_next_state, '{moves}', to_jsonb(coalesce((v_state->>'moves')::integer, 0) + 1), true);
    v_next_state := jsonb_set(v_next_state, '{winner}', coalesce(to_jsonb(v_winner), 'null'::jsonb), true);
    if v_winner is null then v_next_state := jsonb_set(v_next_state, '{next_symbol}', to_jsonb(case when v_symbol = 'X' then 'O' else 'X' end), true); else v_status := 'finished'; end if;
  elsif v_room.game_key = 'memory_cards' then
    if coalesce(p_action->>'type', '') <> 'flip' then raise exception 'invalid_memory_action' using errcode = '22023'; end if;
    v_index := nullif(p_action->>'index', '')::integer;
    if v_index is null or v_index < 0 or v_index > 7 then raise exception 'invalid_memory_card' using errcode = '22023'; end if;
    v_turn_user := nullif(v_state->>'turn_user_id', '')::uuid;
    if v_turn_user <> v_user_id then raise exception 'not_your_turn' using errcode = '42501'; end if;
    v_revealed := coalesce(v_state->'revealed', '[]'::jsonb);
    v_matched := coalesce(v_state->'matched', '[]'::jsonb);
    if v_index = any(array(select jsonb_array_elements_text(v_revealed)::integer)) or v_index = any(array(select jsonb_array_elements_text(v_matched)::integer)) then raise exception 'card_already_used' using errcode = '22023'; end if;
    if jsonb_array_length(v_revealed) >= 2 then raise exception 'resolve_previous_pair_first' using errcode = '22023'; end if;
    v_revealed := v_revealed || to_jsonb(v_index);
    v_next_state := jsonb_set(v_state, '{revealed}', v_revealed, true);
    if jsonb_array_length(v_revealed) = 2 then
      v_first_index := (v_revealed->>0)::integer;
      v_second_index := (v_revealed->>1)::integer;
      v_deck := v_state->'deck';
      if v_deck->>v_first_index = v_deck->>v_second_index then
        v_matched := v_matched || jsonb_build_array(v_first_index, v_second_index);
        v_scores := jsonb_set(v_state->'scores', array[v_user_id::text], to_jsonb(coalesce((v_state->'scores'->>v_user_id::text)::integer, 0) + 1), true);
        v_next_state := jsonb_set(v_next_state, '{matched}', v_matched, true);
        v_next_state := jsonb_set(v_next_state, '{scores}', v_scores, true);
        v_next_state := jsonb_set(v_next_state, '{revealed}', '[]'::jsonb, true);
        if jsonb_array_length(v_matched) = 8 then v_next_state := jsonb_set(v_next_state, '{winner}', to_jsonb(v_user_id), true); v_status := 'finished'; end if;
      else
        select user_id into v_other_user from public.playground_room_members where room_id = p_room_id and status <> 'left' and user_id <> v_user_id order by seat_no limit 1;
        v_next_state := jsonb_set(v_next_state, '{revealed}', '[]'::jsonb, true);
        v_next_state := jsonb_set(v_next_state, '{turn_user_id}', to_jsonb(v_other_user), true);
      end if;
    end if;
  else
    raise exception 'unsupported_online_game' using errcode = '22023';
  end if;

  insert into public.playground_game_intents(room_id, user_id, turn_no, action) values (p_room_id, v_user_id, v_room.turn_no + 1, p_action) returning * into v_intent;
  update public.playground_rooms set turn_no = v_room.turn_no + 1, state = v_next_state, status = v_status, finished_at = case when v_status = 'finished' then now() else finished_at end where id = p_room_id;
  return jsonb_build_object('accepted', true, 'intent_id', v_intent.id, 'turn_no', v_intent.turn_no, 'status', v_status, 'snapshot', public.playground_room_snapshot(p_room_id));
end;
$$;

create or replace function public.heartbeat_playground_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.playground_room_members set status = 'joined', last_seen_at = now() where room_id = p_room_id and user_id = v_user_id and status in ('joined','disconnected');
  if not found then raise exception 'not_room_member' using errcode = '42501'; end if;
  update public.playground_room_members set status = 'disconnected' where room_id = p_room_id and user_id <> v_user_id and status = 'joined' and last_seen_at < now() - interval '45 seconds';
  return public.playground_room_snapshot(p_room_id);
end;
$$;

create or replace function public.leave_playground_room(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  update public.playground_room_members set status = 'left', last_seen_at = now() where room_id = p_room_id and user_id = v_user_id and status <> 'left';
  if not found then raise exception 'not_room_member' using errcode = '42501'; end if;
  update public.playground_rooms set status = 'cancelled', finished_at = now() where id = p_room_id and status in ('waiting','active') and not exists (select 1 from public.playground_room_members where room_id = p_room_id and status = 'joined');
  return jsonb_build_object('left', true, 'room_id', p_room_id);
end;
$$;

revoke all on function public.playground_initial_state(text, uuid, uuid) from public;
revoke all on function public.playground_tic_winner(jsonb) from public;
revoke all on function public.playground_room_snapshot(uuid) from public;
revoke all on function public.find_playground_match(text) from public;
revoke all on function public.heartbeat_playground_room(uuid) from public;
revoke all on function public.leave_playground_room(uuid) from public;
revoke all on function public.submit_playground_intent(uuid, jsonb) from public;
revoke all on function public.join_playground_room(text) from public;
grant execute on function public.playground_room_snapshot(uuid) to authenticated;
grant execute on function public.find_playground_match(text) to authenticated;
grant execute on function public.heartbeat_playground_room(uuid) to authenticated;
grant execute on function public.leave_playground_room(uuid) to authenticated;
grant execute on function public.submit_playground_intent(uuid, jsonb) to authenticated;
grant execute on function public.join_playground_room(text) to authenticated;

comment on function public.find_playground_match(text) is 'Pairs authenticated learners only within exact game, age-band, and guardian-control scope under a transaction lock.';
comment on function public.submit_playground_intent(uuid, jsonb) is 'Validates Tic-tac-toe and Memory Cards moves server-side and settles authoritative room state.';
comment on function public.heartbeat_playground_room(uuid) is 'Reconnect-safe presence heartbeat. Stale joined members are marked disconnected without exposing identity.';
