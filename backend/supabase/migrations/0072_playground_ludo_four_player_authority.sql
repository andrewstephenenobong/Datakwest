-- 0072_playground_ludo_four_player_authority.sql
-- Four-player Ludo private rooms. Clients submit intents; the server owns dice,
-- turn order, movement legality, captures, and settlement state.

alter table public.playground_rooms drop constraint if exists playground_rooms_game_key_check;
alter table public.playground_rooms add constraint playground_rooms_game_key_check check (game_key in ('tic_tac_toe', 'memory_cards', 'owl_snake', 'connect_four', 'ludo'));
alter table public.playground_matchmaking_queue drop constraint if exists playground_matchmaking_queue_game_key_check;
alter table public.playground_matchmaking_queue add constraint playground_matchmaking_queue_game_key_check check (game_key in ('tic_tac_toe', 'memory_cards', 'owl_snake', 'connect_four', 'ludo'));

create or replace function public.create_playground_room(p_game_key text, p_visibility text default 'private', p_max_players integer default 2)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid := auth.uid(); v_pref public.learner_preferences; v_room public.playground_rooms; v_invite text;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in ('tic_tac_toe','memory_cards','owl_snake','connect_four','ludo') then raise exception 'invalid_game_key' using errcode='22023'; end if;
  if p_visibility not in ('private','matchmaking','local') then raise exception 'invalid_room_visibility' using errcode='22023'; end if;
  if p_max_players not between 2 and 4 then raise exception 'invalid_player_limit' using errcode='22023'; end if;
  if p_game_key = 'ludo' and p_max_players <> 4 then raise exception 'ludo_requires_four_players' using errcode='22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id=v_user_id;
  v_invite := case when p_visibility='private' then upper(substr(replace(gen_random_uuid()::text,'-',''),1,10)) else null end;
  insert into public.playground_rooms(game_key,visibility,status,host_id,age_band,guardian_controlled,max_players,invite_code)
  values (p_game_key,p_visibility,'waiting',v_user_id,coalesce(v_pref.age_band,'13_plus'),coalesce(v_pref.guardian_controlled,false),p_max_players,v_invite)
  returning * into v_room;
  insert into public.playground_room_members(room_id,user_id,seat_no) values (v_room.id,v_user_id,1);
  return jsonb_build_object('room_id',v_room.id,'game_key',v_room.game_key,'visibility',v_room.visibility,'invite_code',v_room.invite_code,'status',v_room.status,'max_players',v_room.max_players,'players_joined',1);
end;
$fn$;

create or replace function public.playground_ludo_initial_state(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_players jsonb := '{}'::jsonb; v_member record; v_color text;
begin
  for v_member in select user_id, seat_no from public.playground_room_members where room_id=p_room_id and status <> 'left' order by seat_no loop
    v_color := case v_member.seat_no when 1 then 'blue' when 2 then 'red' when 3 then 'yellow' else 'green' end;
    v_players := jsonb_set(v_players, array[v_member.user_id::text], jsonb_build_object('seat_no',v_member.seat_no,'color',v_color), true);
  end loop;
  return jsonb_build_object('version',1,'track_length',52,'home_stretch',5,'finish',57,'players',v_players,'turn_seat',1,'last_roll',null,'legal_pieces',jsonb_build_array(),'winner_order',jsonb_build_array(),'pieces',jsonb_build_object());
end;
$fn$;

create or replace function public.join_playground_room(p_invite_code text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid := auth.uid(); v_room public.playground_rooms; v_pref public.learner_preferences; v_seat integer; v_state jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select * into v_room from public.playground_rooms where invite_code=upper(trim(p_invite_code)) and status='waiting' and expires_at>now() for update;
  if not found then raise exception 'room_unavailable' using errcode='22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id=v_user_id;
  if coalesce(v_pref.age_band,'13_plus') <> v_room.age_band or coalesce(v_pref.guardian_controlled,false) <> v_room.guardian_controlled then raise exception 'room_age_scope_mismatch' using errcode='42501'; end if;
  if exists(select 1 from public.playground_room_members where room_id=v_room.id and user_id=v_user_id and status <> 'left') then raise exception 'already_in_room' using errcode='23505'; end if;
  select coalesce(max(seat_no),0)+1 into v_seat from public.playground_room_members where room_id=v_room.id and status <> 'left';
  if v_seat > v_room.max_players then raise exception 'room_full' using errcode='22023'; end if;
  insert into public.playground_room_members(room_id,user_id,seat_no) values(v_room.id,v_user_id,v_seat);
  if v_room.game_key='ludo' then
    if v_seat >= v_room.max_players then v_state := public.playground_ludo_initial_state(v_room.id); update public.playground_rooms set status='active',state=v_state where id=v_room.id; end if;
  elsif v_seat >= 2 then
    v_state := public.playground_initial_state(v_room.game_key,v_room.host_id,v_user_id); update public.playground_rooms set status='active',state=v_state where id=v_room.id;
  end if;
  return jsonb_build_object('room_id',v_room.id,'game_key',v_room.game_key,'status',case when (v_room.game_key='ludo' and v_seat>=v_room.max_players) or (v_room.game_key<>'ludo' and v_seat>=2) then 'active' else 'waiting' end,'seat_no',v_seat,'players_joined',v_seat,'max_players',v_room.max_players);
end;
$fn$;

create or replace function public.submit_playground_ludo_intent(p_room_id uuid, p_action jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid := auth.uid(); v_room public.playground_rooms; v_member public.playground_room_members; v_state jsonb; v_action_type text; v_roll integer; v_piece integer; v_position integer; v_next integer; v_legal jsonb; v_pieces jsonb; v_next_pieces jsonb; v_next_state jsonb; v_next_turn integer; v_winners jsonb; v_winner_count integer; v_member_count integer; v_target record; v_target_pieces jsonb; v_global integer; v_target_global integer; v_offset integer; v_target_offset integer; v_intent public.playground_game_intents; v_status text := 'active';
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_action is null or jsonb_typeof(p_action)<>'object' or octet_length(p_action::text)>4000 then raise exception 'invalid_game_action' using errcode='22023'; end if;
  select * into v_room from public.playground_rooms where id=p_room_id and game_key='ludo' and status='active' and expires_at>now() for update;
  if not found then raise exception 'room_not_active' using errcode='22023'; end if;
  select * into v_member from public.playground_room_members where room_id=p_room_id and user_id=v_user_id and status in ('joined','disconnected');
  if not found then raise exception 'not_room_member' using errcode='42501'; end if;
  if v_member.status='disconnected' then update public.playground_room_members set status='joined',last_seen_at=now() where room_id=p_room_id and user_id=v_user_id; end if;
  v_state := v_room.state;
  if (v_state->>'turn_seat')::integer <> v_member.seat_no then raise exception 'not_your_turn' using errcode='42501'; end if;
  if coalesce(v_state->>'winner_order','[]')::jsonb ? v_user_id::text then raise exception 'player_already_finished' using errcode='22023'; end if;
  v_action_type := coalesce(p_action->>'type','');
  if v_action_type='roll' then
    if v_state->'last_roll' is not null and v_state->>'last_roll' <> 'null' then raise exception 'move_required_before_roll' using errcode='22023'; end if;
    v_roll := floor(random()*6)::integer+1;
    v_pieces := coalesce(v_state->'pieces'->v_user_id::text,'[-1,-1,-1,-1]'::jsonb);
    v_legal := '[]'::jsonb;
    for v_piece in 0..3 loop
      v_position := coalesce((v_pieces->>v_piece)::integer,-1);
      if (v_position=-1 and v_roll=6) or (v_position>=0 and v_position+v_roll <= (v_state->>'finish')::integer) then v_legal := v_legal || to_jsonb(v_piece); end if;
    end loop;
    v_next_state := jsonb_set(v_state,'{last_roll}',to_jsonb(v_roll),true);
    v_next_state := jsonb_set(v_next_state,'{legal_pieces}',v_legal,true);
    if jsonb_array_length(v_legal)=0 then
      v_next_turn := case when v_member.seat_no=4 then 1 else v_member.seat_no+1 end;
      v_next_state := jsonb_set(v_next_state,'{turn_seat}',to_jsonb(v_next_turn),true);
      v_next_state := jsonb_set(v_next_state,'{last_roll}','null'::jsonb,true);
    end if;
  elsif v_action_type='move' then
    if v_state->'last_roll' is null or v_state->>'last_roll'='null' then raise exception 'roll_required' using errcode='22023'; end if;
    v_piece := nullif(p_action->>'piece','')::integer;
    if v_piece is null or v_piece<0 or v_piece>3 or not (v_state->'legal_pieces' ? v_piece::text) then raise exception 'invalid_ludo_piece' using errcode='22023'; end if;
    v_roll := (v_state->>'last_roll')::integer; v_pieces := coalesce(v_state->'pieces'->v_user_id::text,'[-1,-1,-1,-1]'::jsonb); v_position := coalesce((v_pieces->>v_piece)::integer,-1); v_next := case when v_position=-1 then 0 else v_position+v_roll end;
    if v_next > (v_state->>'finish')::integer then raise exception 'piece_cannot_reach_nest' using errcode='22023'; end if;
    v_next_pieces := jsonb_set(v_pieces,array[v_piece::text],to_jsonb(v_next),true); v_next_state := jsonb_set(v_state,array['pieces',v_user_id::text],v_next_pieces,true);
    if v_next < 52 then
      v_offset := (v_member.seat_no-1)*13; v_global := (v_offset+v_next)%52;
      for v_target in select user_id,seat_no from public.playground_room_members where room_id=p_room_id and status <> 'left' and user_id<>v_user_id loop
        v_target_pieces := coalesce(v_state->'pieces'->v_target.user_id::text,'[-1,-1,-1,-1]'::jsonb); v_target_offset := (v_target.seat_no-1)*13;
        for v_piece in 0..3 loop
          v_position := coalesce((v_target_pieces->>v_piece)::integer,-1);
          if v_position >= 0 and v_position < 52 and ((v_target_offset+v_position)%52)=v_global then v_target_pieces := jsonb_set(v_target_pieces,array[v_piece::text],to_jsonb(-1),true); end if;
        end loop;
        v_next_state := jsonb_set(v_next_state,array['pieces',v_target.user_id::text],v_target_pieces,true);
      end loop;
    end if;
    if v_next >= (v_state->>'finish')::integer and not (v_state->'winner_order' ? v_user_id::text) then v_winners := coalesce(v_state->'winner_order','[]'::jsonb) || to_jsonb(v_user_id); v_next_state := jsonb_set(v_next_state,'{winner_order}',v_winners,true); else v_winners := coalesce(v_state->'winner_order','[]'::jsonb); end if;
    select count(*) into v_member_count from public.playground_room_members where room_id=p_room_id and status <> 'left'; v_winner_count := jsonb_array_length(v_winners);
    if v_winner_count >= greatest(v_member_count-1,1) then v_status := 'finished'; end if;
    v_next_turn := case when v_member.seat_no=4 then 1 else v_member.seat_no+1 end;
    v_next_state := jsonb_set(v_next_state,'{turn_seat}',to_jsonb(v_next_turn),true); v_next_state := jsonb_set(v_next_state,'{last_roll}','null'::jsonb,true); v_next_state := jsonb_set(v_next_state,'{legal_pieces}','[]'::jsonb,true);
  else raise exception 'invalid_ludo_action' using errcode='22023'; end if;
  insert into public.playground_game_intents(room_id,user_id,turn_no,action) values(p_room_id,v_user_id,v_room.turn_no+1,p_action) returning * into v_intent;
  update public.playground_rooms set turn_no=v_room.turn_no+1,state=v_next_state,status=v_status,finished_at=case when v_status='finished' then now() else finished_at end where id=p_room_id;
  return jsonb_build_object('accepted',true,'intent_id',v_intent.id,'turn_no',v_intent.turn_no,'status',v_status,'snapshot',public.playground_room_snapshot(p_room_id));
end;
$fn$;

create or replace function public.playground_public_state(p_room public.playground_rooms, p_viewer uuid default null, p_relative boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_state jsonb:=p_room.state; v_index integer; v_visible boolean; v_revealed jsonb; v_matched jsonb; v_masked_deck jsonb:=jsonb_build_array(null,null,null,null,null,null,null,null); v_turn_user uuid; v_you_symbol text; v_member record; v_players jsonb:='[]'::jsonb; v_pieces jsonb:='{}'::jsonb; v_you_seat integer;
begin
  if p_room.game_key in ('tic_tac_toe','connect_four') then v_you_symbol:=case when p_relative and p_viewer is not null then p_room.state->'players'->>p_viewer::text else null end; v_state:=v_state-'players'; if p_relative then v_state:=jsonb_set(v_state,'{you_symbol}',coalesce(to_jsonb(v_you_symbol),'null'::jsonb),true); v_state:=jsonb_set(v_state,'{your_turn}',to_jsonb(p_room.state->>'next_symbol'=v_you_symbol),true); end if;
  elsif p_room.game_key='memory_cards' then v_revealed:=coalesce(p_room.state->'revealed','[]'::jsonb); v_matched:=coalesce(p_room.state->'matched','[]'::jsonb); for v_index in 0..7 loop v_visible:=v_index=any(array(select jsonb_array_elements_text(v_revealed)::integer)) or v_index=any(array(select jsonb_array_elements_text(v_matched)::integer)); if v_visible then v_masked_deck:=jsonb_set(v_masked_deck,array[v_index::text],p_room.state->'deck'->v_index,true); end if; end loop; v_state:=jsonb_set(v_state,'{deck}',v_masked_deck,true); v_turn_user:=nullif(p_room.state->>'turn_user_id','')::uuid; v_state:=v_state-'turn_user_id'-'players'; if p_relative then v_state:=jsonb_set(v_state,'{your_turn}',to_jsonb(v_turn_user=p_viewer),true); end if;
  elsif p_room.game_key='ludo' then
    for v_member in select user_id,seat_no,status from public.playground_room_members where room_id=p_room.id and status <> 'left' order by seat_no loop
      v_players:=v_players||jsonb_build_array(jsonb_build_object('seat_no',v_member.seat_no,'status',v_member.status,'is_you',v_member.user_id=p_viewer,'color',case v_member.seat_no when 1 then 'blue' when 2 then 'red' when 3 then 'yellow' else 'green' end));
      if v_member.user_id=p_viewer then v_you_seat:=v_member.seat_no; end if;
      v_pieces:=jsonb_set(v_pieces,array[v_member.seat_no::text],coalesce(p_room.state->'pieces'->v_member.user_id::text,'[-1,-1,-1,-1]'::jsonb),true);
    end loop;
    v_state:=jsonb_build_object('version',p_room.state->'version','track_length',p_room.state->'track_length','home_stretch',p_room.state->'home_stretch','finish',p_room.state->'finish','players',v_players,'pieces',v_pieces,'turn_seat',p_room.state->'turn_seat','your_seat',v_you_seat,'your_turn',p_viewer is not null and p_room.state->>'turn_seat'=v_you_seat::text,'last_roll',p_room.state->'last_roll','legal_pieces',case when p_room.state->>'turn_seat'=v_you_seat::text then p_room.state->'legal_pieces' else '[]'::jsonb end,'winner_order',coalesce((select jsonb_agg((m->>'seat_no')::integer order by ord) from jsonb_array_elements(p_room.state->'winner_order') with ordinality as w(m,ord) join public.playground_room_members rm on rm.user_id=(m #>> '{}')::uuid and rm.room_id=p_room.id),'[]'::jsonb));
  end if;
  return v_state;
end;
$fn$;

create or replace function public.playground_room_snapshot(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid:=auth.uid(); v_room public.playground_rooms; v_members jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select * into v_room from public.playground_rooms where id=p_room_id and expires_at>now(); if not found then raise exception 'room_unavailable' using errcode='22023'; end if;
  if not exists(select 1 from public.playground_room_members where room_id=p_room_id and user_id=v_user_id and status in ('joined','disconnected')) then raise exception 'not_room_member' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('seat_no',seat_no,'status',status,'is_you',user_id=v_user_id) order by seat_no),'[]'::jsonb) into v_members from public.playground_room_members where room_id=p_room_id and status<>'left';
  return jsonb_build_object('room_id',v_room.id,'game_key',v_room.game_key,'status',v_room.status,'visibility',v_room.visibility,'turn_no',v_room.turn_no,'state',public.playground_public_state(v_room,v_user_id,true),'members',v_members,'expires_at',v_room.expires_at);
end;
$fn$;

revoke all on function public.playground_ludo_initial_state(uuid) from public;
revoke all on function public.submit_playground_ludo_intent(uuid,jsonb) from public;
revoke all on function public.playground_public_state(public.playground_rooms,uuid,boolean) from public;
grant execute on function public.submit_playground_ludo_intent(uuid,jsonb) to authenticated;

comment on function public.submit_playground_ludo_intent(uuid,jsonb) is 'Server-authoritative four-player Ludo roll and move RPC. Dice, turns, captures, and win order are never client-controlled.';
comment on function public.playground_room_snapshot(uuid) is 'Member-safe snapshot for all Playground games, including anonymized four-player Ludo seats and piece positions.';
