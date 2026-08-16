-- 0067_playground_connect_four_private_rooms.sql
-- Allow Connect Four in the existing protected private-room RPC.

create or replace function public.create_playground_room(p_game_key text, p_visibility text default 'private', p_max_players integer default 2)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid:=auth.uid(); v_pref public.learner_preferences; v_room public.playground_rooms; v_invite text;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in ('tic_tac_toe','memory_cards','owl_snake','connect_four') then raise exception 'invalid_game_key' using errcode='22023'; end if;
  if p_visibility not in ('private','matchmaking','local') then raise exception 'invalid_room_visibility' using errcode='22023'; end if;
  if p_max_players not between 2 and 4 then raise exception 'invalid_player_limit' using errcode='22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id=v_user_id;
  v_invite:=case when p_visibility='private' then upper(substr(encode(gen_random_bytes(8),'hex'),1,10)) else null end;
  insert into public.playground_rooms(game_key,visibility,host_id,age_band,guardian_controlled,max_players,invite_code) values (p_game_key,p_visibility,v_user_id,coalesce(v_pref.age_band,'13_plus'),coalesce(v_pref.guardian_controlled,false),p_max_players,v_invite) returning * into v_room;
  insert into public.playground_room_members(room_id,user_id,seat_no) values (v_room.id,v_user_id,1);
  return jsonb_build_object('room_id',v_room.id,'game_key',v_room.game_key,'visibility',v_room.visibility,'invite_code',v_room.invite_code,'status',v_room.status,'max_players',v_room.max_players);
end;
$$;

revoke all on function public.create_playground_room(text,text,integer) from public;
grant execute on function public.create_playground_room(text,text,integer) to authenticated;
