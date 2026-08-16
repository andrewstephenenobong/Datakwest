-- 0062_playground_snapshot_identity_minimization.sql
-- Public room snapshots expose player-relative state, never raw auth user IDs.

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
  v_public_state jsonb;
  v_masked_deck jsonb := jsonb_build_array(null, null, null, null, null, null, null, null);
  v_index integer;
  v_revealed jsonb;
  v_matched jsonb;
  v_visible boolean;
  v_you_symbol text;
  v_turn_user uuid;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into v_room from public.playground_rooms where id = p_room_id and expires_at > now();
  if not found then raise exception 'room_unavailable' using errcode = '22023'; end if;
  if not exists (select 1 from public.playground_room_members where room_id = p_room_id and user_id = v_user_id and status in ('joined','disconnected')) then raise exception 'not_room_member' using errcode = '42501'; end if;

  v_public_state := v_room.state;
  if v_room.game_key = 'tic_tac_toe' then
    v_you_symbol := v_room.state->'players'->>v_user_id::text;
    v_public_state := v_public_state - 'players';
    v_public_state := jsonb_set(v_public_state, '{you_symbol}', coalesce(to_jsonb(v_you_symbol), 'null'::jsonb), true);
    v_public_state := jsonb_set(v_public_state, '{your_turn}', to_jsonb(v_room.state->>'next_symbol' = v_you_symbol), true);
  elsif v_room.game_key = 'memory_cards' then
    v_revealed := coalesce(v_room.state->'revealed', '[]'::jsonb);
    v_matched := coalesce(v_room.state->'matched', '[]'::jsonb);
    for v_index in 0..7 loop
      v_visible := v_index = any(array(select jsonb_array_elements_text(v_revealed)::integer)) or v_index = any(array(select jsonb_array_elements_text(v_matched)::integer));
      if v_visible then v_masked_deck := jsonb_set(v_masked_deck, array[v_index::text], v_room.state->'deck'->v_index, true); end if;
    end loop;
    v_public_state := jsonb_set(v_public_state, '{deck}', v_masked_deck, true);
    v_turn_user := nullif(v_room.state->>'turn_user_id', '')::uuid;
    v_public_state := v_public_state - 'turn_user_id';
    v_public_state := jsonb_set(v_public_state, '{your_turn}', to_jsonb(v_turn_user = v_user_id), true);
    v_public_state := v_public_state - 'players';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('seat_no', seat_no, 'status', status, 'is_you', user_id = v_user_id) order by seat_no), '[]'::jsonb)
    into v_members
  from public.playground_room_members
  where room_id = p_room_id and status <> 'left';

  return jsonb_build_object('room_id', v_room.id, 'game_key', v_room.game_key, 'status', v_room.status, 'visibility', v_room.visibility, 'turn_no', v_room.turn_no, 'state', v_public_state, 'members', v_members, 'expires_at', v_room.expires_at);
end;
$$;

revoke all on function public.playground_room_snapshot(uuid) from public;
grant execute on function public.playground_room_snapshot(uuid) to authenticated;

comment on function public.playground_room_snapshot(uuid) is 'Member-safe snapshot with hidden Memory Cards values and no raw auth user identifiers.';
