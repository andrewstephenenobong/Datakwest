-- 0064_playground_connect_four_authoritative.sql
-- Connect Four server-authoritative adapter.

alter table public.playground_rooms drop constraint if exists playground_rooms_game_key_check;
alter table public.playground_rooms add constraint playground_rooms_game_key_check check (game_key in ('tic_tac_toe', 'memory_cards', 'owl_snake', 'connect_four'));
alter table public.playground_matchmaking_queue drop constraint if exists playground_matchmaking_queue_game_key_check;
alter table public.playground_matchmaking_queue add constraint playground_matchmaking_queue_game_key_check check (game_key in ('tic_tac_toe', 'memory_cards', 'owl_snake', 'connect_four'));

create or replace function public.playground_initial_state(p_game_key text, p_host_id uuid, p_guest_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_deck jsonb;
begin
  if p_game_key = 'tic_tac_toe' then
    return jsonb_build_object('version', 1, 'board', jsonb_build_array(null,null,null,null,null,null,null,null,null,null), 'players', jsonb_build_object(p_host_id::text,'X',p_guest_id::text,'O'), 'next_symbol','X','winner',null,'moves',0);
  elsif p_game_key = 'memory_cards' then
    select jsonb_agg(to_jsonb(value) order by random()) into v_deck from unnest(array['owl','owl','star','star','moon','moon','bolt','bolt']) as item(value);
    return jsonb_build_object('version',1,'deck',v_deck,'players',jsonb_build_array(p_host_id,p_guest_id),'turn_user_id',p_host_id,'revealed',jsonb_build_array(),'matched',jsonb_build_array(),'scores',jsonb_build_object(p_host_id::text,0,p_guest_id::text,0),'winner',null);
  elsif p_game_key = 'connect_four' then
    return jsonb_build_object('version',1,'board',jsonb_build_array(null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null),'players',jsonb_build_object(p_host_id::text,'X',p_guest_id::text,'O'),'next_symbol','X','winner',null,'moves',0);
  end if;
  raise exception 'unsupported_online_game' using errcode = '22023';
end;
$$;

create or replace function public.playground_connect_four_winner(p_board jsonb, p_row integer, p_column integer, p_symbol text)
returns text language plpgsql immutable security definer set search_path = public, pg_catalog as $$
declare v_row integer; v_col integer; v_count integer; v_row_step integer; v_col_step integer; v_sign integer;
begin
  for v_row_step, v_col_step in select * from (values (1,0),(0,1),(1,1),(1,-1)) as directions(row_step,col_step) loop
    v_count := 1;
    for v_sign in -1..1 by 2 loop
      v_row := p_row + v_row_step * v_sign; v_col := p_column + v_col_step * v_sign;
      while v_row between 0 and 5 and v_col between 0 and 6 and p_board->>(v_row * 7 + v_col) = p_symbol loop
        v_count := v_count + 1; v_row := v_row + v_row_step * v_sign; v_col := v_col + v_col_step * v_sign;
      end loop;
    end loop;
    if v_count >= 4 then return p_symbol; end if;
  end loop;
  if not exists (select 1 from generate_series(0,41) as cells(index) where p_board->>cells.index is null) then return 'draw'; end if;
  return null;
end;
$$;

create or replace function public.find_playground_match(p_game_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid := auth.uid(); v_pref public.learner_preferences; v_opponent public.playground_matchmaking_queue; v_room public.playground_rooms; v_state jsonb; v_age_band text; v_guardian_controlled boolean;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_game_key not in ('tic_tac_toe','memory_cards','connect_four') then raise exception 'matchmaking_not_available_for_game' using errcode = '22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id = v_user_id;
  v_age_band := coalesce(v_pref.age_band,'13_plus'); v_guardian_controlled := coalesce(v_pref.guardian_controlled,false);
  perform pg_advisory_xact_lock(hashtext('datakwest_playground:' || p_game_key || ':' || v_age_band || ':' || v_guardian_controlled::text));
  delete from public.playground_matchmaking_queue where expires_at <= now();
  if not exists (select 1 from public.playground_matchmaking_queue where user_id = v_user_id and game_key = p_game_key and expires_at > now()) then
    insert into public.playground_matchmaking_queue(user_id,game_key,age_band,guardian_controlled) values (v_user_id,p_game_key,v_age_band,v_guardian_controlled)
    on conflict (user_id) do update set game_key=excluded.game_key,age_band=excluded.age_band,guardian_controlled=excluded.guardian_controlled,queued_at=now(),expires_at=now()+interval '10 minutes';
  end if;
  select * into v_opponent from public.playground_matchmaking_queue where user_id <> v_user_id and game_key=p_game_key and age_band=v_age_band and guardian_controlled=v_guardian_controlled and expires_at > now() order by queued_at,user_id limit 1 for update skip locked;
  if not found then return jsonb_build_object('matched',false,'queued',true,'game_key',p_game_key); end if;
  v_state := public.playground_initial_state(p_game_key,v_user_id,v_opponent.user_id);
  insert into public.playground_rooms(game_key,visibility,status,host_id,age_band,guardian_controlled,max_players,state) values (p_game_key,'matchmaking','active',v_user_id,v_age_band,v_guardian_controlled,2,v_state) returning * into v_room;
  insert into public.playground_room_members(room_id,user_id,seat_no) values (v_room.id,v_user_id,1),(v_room.id,v_opponent.user_id,2);
  delete from public.playground_matchmaking_queue where user_id in (v_user_id,v_opponent.user_id);
  return jsonb_build_object('matched',true,'queued',false,'room_id',v_room.id,'game_key',p_game_key,'status',v_room.status);
end;
$$;

create or replace function public.submit_playground_intent(p_room_id uuid, p_action jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid := auth.uid(); v_room public.playground_rooms; v_member public.playground_room_members; v_intent public.playground_game_intents; v_state jsonb; v_board jsonb; v_winner text; v_index integer; v_symbol text; v_revealed jsonb; v_matched jsonb; v_deck jsonb; v_scores jsonb; v_turn_user uuid; v_other_user uuid; v_first_index integer; v_second_index integer; v_next_state jsonb; v_status text; v_row integer; v_column integer;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_action is null or jsonb_typeof(p_action) <> 'object' or octet_length(p_action::text) > 4000 then raise exception 'invalid_game_action' using errcode = '22023'; end if;
  select * into v_room from public.playground_rooms where id=p_room_id and status='active' and expires_at > now() for update;
  if not found then raise exception 'room_not_active' using errcode = '22023'; end if;
  select * into v_member from public.playground_room_members where room_id=p_room_id and user_id=v_user_id and status in ('joined','disconnected');
  if not found then raise exception 'not_room_member' using errcode = '42501'; end if;
  if v_member.status='disconnected' then update public.playground_room_members set status='joined',last_seen_at=now() where room_id=p_room_id and user_id=v_user_id; end if;
  v_state := v_room.state; v_status := 'active';

  if v_room.game_key='tic_tac_toe' then
    if coalesce(p_action->>'type','') <> 'place' then raise exception 'invalid_tic_action' using errcode='22023'; end if;
    v_index := nullif(p_action->>'index','')::integer;
    if v_index is null or v_index < 0 or v_index > 8 then raise exception 'invalid_tic_cell' using errcode='22023'; end if;
    v_symbol := case when v_member.seat_no=1 then 'X' else 'O' end;
    if v_state->>'next_symbol' <> v_symbol then raise exception 'not_your_turn' using errcode='42501'; end if;
    v_board := v_state->'board'; if v_board->v_index is not null and v_board->v_index <> 'null'::jsonb then raise exception 'cell_already_taken' using errcode='22023'; end if;
    v_board := jsonb_set(v_board,array[v_index::text],to_jsonb(v_symbol),false); v_winner := public.playground_tic_winner(v_board); v_next_state := jsonb_set(v_state,'{board}',v_board,true); v_next_state := jsonb_set(v_next_state,'{moves}',to_jsonb(coalesce((v_state->>'moves')::integer,0)+1),true); v_next_state := jsonb_set(v_next_state,'{winner}',coalesce(to_jsonb(v_winner),'null'::jsonb),true); if v_winner is null then v_next_state := jsonb_set(v_next_state,'{next_symbol}',to_jsonb(case when v_symbol='X' then 'O' else 'X' end),true); else v_status:='finished'; end if;
  elsif v_room.game_key='memory_cards' then
    if coalesce(p_action->>'type','') <> 'flip' then raise exception 'invalid_memory_action' using errcode='22023'; end if;
    v_index := nullif(p_action->>'index','')::integer; if v_index is null or v_index < 0 or v_index > 7 then raise exception 'invalid_memory_card' using errcode='22023'; end if;
    v_turn_user := nullif(v_state->>'turn_user_id','')::uuid; if v_turn_user <> v_user_id then raise exception 'not_your_turn' using errcode='42501'; end if;
    v_revealed := coalesce(v_state->'revealed','[]'::jsonb); v_matched := coalesce(v_state->'matched','[]'::jsonb); if v_index = any(array(select jsonb_array_elements_text(v_revealed)::integer)) or v_index = any(array(select jsonb_array_elements_text(v_matched)::integer)) then raise exception 'card_already_used' using errcode='22023'; end if; if jsonb_array_length(v_revealed)>=2 then raise exception 'resolve_previous_pair_first' using errcode='22023'; end if;
    v_revealed := v_revealed || to_jsonb(v_index); v_next_state := jsonb_set(v_state,'{revealed}',v_revealed,true);
    if jsonb_array_length(v_revealed)=2 then v_first_index := (v_revealed->>0)::integer; v_second_index := (v_revealed->>1)::integer; v_deck := v_state->'deck'; if v_deck->>v_first_index=v_deck->>v_second_index then v_matched := v_matched || jsonb_build_array(v_first_index,v_second_index); v_scores := jsonb_set(v_state->'scores',array[v_user_id::text],to_jsonb(coalesce((v_state->'scores'->>v_user_id::text)::integer,0)+1),true); v_next_state := jsonb_set(v_next_state,'{matched}',v_matched,true); v_next_state := jsonb_set(v_next_state,'{scores}',v_scores,true); v_next_state := jsonb_set(v_next_state,'{revealed}','[]'::jsonb,true); if jsonb_array_length(v_matched)=8 then v_next_state := jsonb_set(v_next_state,'{winner}',to_jsonb(v_user_id),true); v_status:='finished'; end if; else select user_id into v_other_user from public.playground_room_members where room_id=p_room_id and status <> 'left' and user_id <> v_user_id order by seat_no limit 1; v_next_state := jsonb_set(v_next_state,'{revealed}','[]'::jsonb,true); v_next_state := jsonb_set(v_next_state,'{turn_user_id}',to_jsonb(v_other_user),true); end if; end if;
  elsif v_room.game_key='connect_four' then
    if coalesce(p_action->>'type','') <> 'drop' then raise exception 'invalid_connect_four_action' using errcode='22023'; end if;
    v_column := nullif(p_action->>'column','')::integer; if v_column is null or v_column < 0 or v_column > 6 then raise exception 'invalid_connect_four_column' using errcode='22023'; end if;
    v_symbol := case when v_member.seat_no=1 then 'X' else 'O' end; if v_state->>'next_symbol' <> v_symbol then raise exception 'not_your_turn' using errcode='42501'; end if;
    v_board := v_state->'board'; v_row := 5; while v_row >= 0 and v_board->>(v_row*7+v_column) is not null loop v_row := v_row - 1; end loop; if v_row < 0 then raise exception 'column_full' using errcode='22023'; end if;
    v_index := v_row*7+v_column; v_board := jsonb_set(v_board,array[v_index::text],to_jsonb(v_symbol),false); v_winner := public.playground_connect_four_winner(v_board,v_row,v_column,v_symbol); v_next_state := jsonb_set(v_state,'{board}',v_board,true); v_next_state := jsonb_set(v_next_state,'{moves}',to_jsonb(coalesce((v_state->>'moves')::integer,0)+1),true); v_next_state := jsonb_set(v_next_state,'{winner}',coalesce(to_jsonb(v_winner),'null'::jsonb),true); if v_winner is null then v_next_state := jsonb_set(v_next_state,'{next_symbol}',to_jsonb(case when v_symbol='X' then 'O' else 'X' end),true); else v_status:='finished'; end if;
  else raise exception 'unsupported_online_game' using errcode='22023'; end if;

  insert into public.playground_game_intents(room_id,user_id,turn_no,action) values (p_room_id,v_user_id,v_room.turn_no+1,p_action) returning * into v_intent;
  update public.playground_rooms set turn_no=v_room.turn_no+1,state=v_next_state,status=v_status,finished_at=case when v_status='finished' then now() else finished_at end where id=p_room_id;
  return jsonb_build_object('accepted',true,'intent_id',v_intent.id,'turn_no',v_intent.turn_no,'status',v_status,'snapshot',public.playground_room_snapshot(p_room_id));
end;
$$;

revoke all on function public.playground_initial_state(text,uuid,uuid) from public;
revoke all on function public.playground_connect_four_winner(jsonb,integer,integer,text) from public;
revoke all on function public.find_playground_match(text) from public;
revoke all on function public.submit_playground_intent(uuid,jsonb) from public;
grant execute on function public.playground_initial_state(text,uuid,uuid) to authenticated;
grant execute on function public.find_playground_match(text) to authenticated;
grant execute on function public.submit_playground_intent(uuid,jsonb) to authenticated;
