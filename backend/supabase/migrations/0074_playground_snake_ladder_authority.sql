-- Snake & Ladder server-authoritative multiplayer contract.
-- The client submits only a roll intent. The server owns dice, movement,
-- snakes, ladders, turn order, snapshots, and result settlement.

alter table public.playground_player_ratings drop constraint if exists playground_player_ratings_game_key_check;
alter table public.playground_player_ratings add constraint playground_player_ratings_game_key_check check (game_key in ('tic_tac_toe','memory_cards','connect_four','ludo','snake_ladder'));

create or replace function public.playground_initial_state(p_game_key text, p_host_id uuid, p_guest_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_deck jsonb;
begin
  if p_game_key = 'tic_tac_toe' then
    return jsonb_build_object('version',1,'board',jsonb_build_array(null,null,null,null,null,null,null,null,null),'players',jsonb_build_object(p_host_id::text,'X',p_guest_id::text,'O'),'next_symbol','X','winner',null,'moves',0);
  end if;
  if p_game_key = 'memory_cards' then
    select jsonb_agg(to_jsonb(value) order by random()) into v_deck from unnest(array['owl','owl','star','star','moon','moon','bolt','bolt']) as item(value);
    return jsonb_build_object('version',1,'deck',v_deck,'players',jsonb_build_array(p_host_id,p_guest_id),'turn_user_id',p_host_id,'revealed',jsonb_build_array(),'matched',jsonb_build_array(),'scores',jsonb_build_object(p_host_id::text,0,p_guest_id::text,0),'winner',null);
  end if;
  if p_game_key in ('snake_ladder','owl_snake') then
    return jsonb_build_object('version',1,'game_key',p_game_key,'players',jsonb_build_object(p_host_id::text,1,p_guest_id::text,1),'turn_user_id',p_host_id,'winner',null,'last_roll',null,'last_event','Roll the die to begin.','moves',0);
  end if;
  raise exception 'unsupported_online_game' using errcode='22023';
end;
$fn$;

create or replace function public.create_playground_room(p_game_key text, p_visibility text default 'private', p_max_players integer default 2)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid:=auth.uid(); v_pref public.learner_preferences; v_room public.playground_rooms; v_invite text;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in ('tic_tac_toe','memory_cards','owl_snake','snake_ladder','connect_four','ludo') then raise exception 'invalid_game_key' using errcode='22023'; end if;
  if p_visibility not in ('private','matchmaking','local') then raise exception 'invalid_room_visibility' using errcode='22023'; end if;
  if p_max_players not between 2 and 4 then raise exception 'invalid_player_limit' using errcode='22023'; end if;
  if p_game_key='snake_ladder' and p_max_players<>2 then raise exception 'snake_ladder_requires_two_players' using errcode='22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id=v_user_id;
  v_invite:=case when p_visibility='private' then upper(substr(encode(gen_random_bytes(8),'hex'),1,10)) else null end;
  insert into public.playground_rooms(game_key,visibility,host_id,age_band,guardian_controlled,max_players,invite_code) values(p_game_key,p_visibility,v_user_id,coalesce(v_pref.age_band,'13_plus'),coalesce(v_pref.guardian_controlled,false),p_max_players,v_invite) returning * into v_room;
  insert into public.playground_room_members(room_id,user_id,seat_no) values(v_room.id,v_user_id,1);
  return jsonb_build_object('room_id',v_room.id,'game_key',v_room.game_key,'visibility',v_room.visibility,'invite_code',v_room.invite_code,'status',v_room.status,'max_players',v_room.max_players);
end;
$fn$;

create or replace function public.find_playground_match(p_game_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid:=auth.uid(); v_pref public.learner_preferences; v_opponent record; v_room public.playground_rooms; v_state jsonb; v_age_band text; v_guardian boolean; v_rating integer; v_window integer;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in ('tic_tac_toe','memory_cards','connect_four','ludo','snake_ladder') then raise exception 'matchmaking_not_available_for_game' using errcode='22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id=v_user_id;
  v_age_band:=coalesce(v_pref.age_band,'13_plus'); v_guardian:=coalesce(v_pref.guardian_controlled,false); v_rating:=public.playground_rating_for(v_user_id,p_game_key);
  perform pg_advisory_xact_lock(hashtext('datakwest_playground:'||p_game_key||':'||v_age_band||':'||v_guardian::text));
  delete from public.playground_matchmaking_queue where expires_at<=now();
  if not exists(select 1 from public.playground_matchmaking_queue where user_id=v_user_id and game_key=p_game_key and expires_at>now()) then
    insert into public.playground_matchmaking_queue(user_id,game_key,age_band,guardian_controlled,rating,rating_window) values(v_user_id,p_game_key,v_age_band,v_guardian,v_rating,100)
    on conflict(user_id) do update set game_key=excluded.game_key,age_band=excluded.age_band,guardian_controlled=excluded.guardian_controlled,rating=excluded.rating,queued_at=now(),expires_at=now()+interval '10 minutes';
  end if;
  update public.playground_matchmaking_queue set rating_window=least(400,100+greatest(0,floor(extract(epoch from(now()-queued_at))/30)::integer)*50) where game_key=p_game_key and age_band=v_age_band and guardian_controlled=v_guardian and expires_at>now();
  select q.user_id,q.rating into v_opponent from public.playground_matchmaking_queue q where q.user_id<>v_user_id and q.game_key=p_game_key and q.age_band=v_age_band and q.guardian_controlled=v_guardian and q.expires_at>now() and abs(q.rating-v_rating)<=q.rating_window order by q.queued_at,q.user_id limit 1 for update skip locked;
  if not found then return jsonb_build_object('matched',false,'queued',true,'game_key',p_game_key,'rating',v_rating,'rating_window',coalesce((select rating_window from public.playground_matchmaking_queue where user_id=v_user_id),100)); end if;
  v_state:=public.playground_initial_state(p_game_key,v_user_id,v_opponent.user_id);
  insert into public.playground_rooms(game_key,visibility,status,host_id,age_band,guardian_controlled,max_players,state) values(p_game_key,'matchmaking','active',v_user_id,v_age_band,v_guardian,2,v_state) returning * into v_room;
  insert into public.playground_room_members(room_id,user_id,seat_no) values(v_room.id,v_user_id,1),(v_room.id,v_opponent.user_id,2);
  delete from public.playground_matchmaking_queue where user_id in(v_user_id,v_opponent.user_id);
  return jsonb_build_object('matched',true,'queued',false,'room_id',v_room.id,'game_key',p_game_key,'status',v_room.status,'rating_gap',abs(v_rating-v_opponent.rating));
end;
$fn$;

create or replace function public.playground_snake_ladder_step(p_position integer, p_roll integer)
returns integer language plpgsql immutable security definer set search_path = public, pg_catalog as $fn$
declare v_next integer:=least(100,p_position+p_roll);
begin
  if v_next>100 then return p_position; end if;
  v_next:=case v_next when 4 then 14 when 9 then 31 when 17 then 7 when 20 then 38 when 28 then 84 when 40 then 59 when 51 then 67 when 54 then 34 when 62 then 19 when 63 then 81 when 64 then 60 when 87 then 24 when 93 then 73 when 95 then 75 when 99 then 78 else v_next end;
  return v_next;
end;
$fn$;

create or replace function public.playground_snake_ladder_snapshot(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user uuid:=auth.uid(); v_room public.playground_rooms; v_members jsonb; v_players jsonb; v_turn uuid; v_winner uuid;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select * into v_room from public.playground_rooms where id=p_room_id and expires_at>now();
  if not found then raise exception 'room_unavailable' using errcode='22023'; end if;
  if not exists(select 1 from public.playground_room_members where room_id=p_room_id and user_id=v_user and status in('joined','disconnected')) then raise exception 'not_room_member' using errcode='42501'; end if;
  v_turn:=nullif(v_room.state->>'turn_user_id','')::uuid; v_winner:=nullif(v_room.state->>'winner','')::uuid;
  select coalesce(jsonb_agg(jsonb_build_object('seat_no',m.seat_no,'status',m.status,'is_you',m.user_id=v_user,'position',coalesce((v_room.state->'players'->>(m.user_id::text))::integer,1)) order by m.seat_no),'[]'::jsonb) into v_members from public.playground_room_members m where m.room_id=p_room_id and m.status<>'left';
  return jsonb_build_object('room_id',v_room.id,'game_key',v_room.game_key,'status',v_room.status,'visibility',v_room.visibility,'turn_seat',(select seat_no from public.playground_room_members where room_id=p_room_id and user_id=v_turn),'winner_seat',(select seat_no from public.playground_room_members where room_id=p_room_id and user_id=v_winner),'last_roll',v_room.state->'last_roll','last_event',v_room.state->>'last_event','moves',coalesce((v_room.state->>'moves')::integer,0),'members',v_members,'expires_at',v_room.expires_at);
end;
$fn$;

create or replace function public.heartbeat_playground_snake_ladder(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  update public.playground_room_members set status='joined',last_seen_at=now() where room_id=p_room_id and user_id=v_user and status in('joined','disconnected');
  if not found then raise exception 'not_room_member' using errcode='42501'; end if;
  update public.playground_room_members set status='disconnected' where room_id=p_room_id and user_id<>v_user and status='joined' and last_seen_at<now()-interval '45 seconds';
  return public.playground_snake_ladder_snapshot(p_room_id);
end;
$fn$;

create or replace function public.submit_playground_snake_ladder_intent(p_room_id uuid, p_action jsonb)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user uuid:=auth.uid(); v_room public.playground_rooms; v_member public.playground_room_members; v_turn uuid; v_other uuid; v_roll integer; v_position integer; v_next integer; v_players jsonb; v_next_state jsonb; v_status text:='active'; v_intent public.playground_game_intents; v_client_id text;
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_action is null or jsonb_typeof(p_action)<>'object' or octet_length(p_action::text)>2000 then raise exception 'invalid_game_action' using errcode='22023'; end if;
  v_client_id:=nullif(p_action->>'client_intent_id','');
  if v_client_id is null or length(v_client_id)>80 then raise exception 'invalid_client_intent_id' using errcode='22023'; end if;
  if exists(select 1 from public.playground_game_intents where room_id=p_room_id and user_id=v_user and action->>'client_intent_id'=v_client_id) then return jsonb_build_object('accepted',true,'duplicate',true,'snapshot',public.playground_snake_ladder_snapshot(p_room_id)); end if;
  select * into v_room from public.playground_rooms where id=p_room_id and game_key='snake_ladder' and status='active' and expires_at>now() for update;
  if not found then raise exception 'room_not_active' using errcode='22023'; end if;
  select * into v_member from public.playground_room_members where room_id=p_room_id and user_id=v_user and status in('joined','disconnected');
  if not found then raise exception 'not_room_member' using errcode='42501'; end if;
  if coalesce(p_action->>'type','')<>'roll' then raise exception 'invalid_snake_ladder_action' using errcode='22023'; end if;
  v_turn:=nullif(v_room.state->>'turn_user_id','')::uuid;
  if v_turn<>v_user then raise exception 'not_your_turn' using errcode='42501'; end if;
  v_other:=(select user_id from public.playground_room_members where room_id=p_room_id and status<>'left' and user_id<>v_user order by seat_no limit 1);
  v_players:=coalesce(v_room.state->'players','{}'::jsonb); v_position:=coalesce((v_players->>(v_user::text))::integer,1); v_roll:=floor(random()*6)::integer+1; v_next:=public.playground_snake_ladder_step(v_position,v_roll);
  v_players:=jsonb_set(v_players,array[v_user::text],to_jsonb(v_next),true);
  v_next_state:=jsonb_set(v_room.state,'{players}',v_players,true); v_next_state:=jsonb_set(v_next_state,'{last_roll}',to_jsonb(v_roll),true); v_next_state:=jsonb_set(v_next_state,'{moves}',to_jsonb(coalesce((v_room.state->>'moves')::integer,0)+1),true); v_next_state:=jsonb_set(v_next_state,'{last_event}',to_jsonb(case when v_next=v_position then format('Rolled %s. Exact finish required.',v_roll) when v_next=100 then 'Reached square 100.' when v_next>v_position+v_roll then format('Rolled %s and climbed to %s.',v_roll,v_next) when v_next<v_position+v_roll then format('Rolled %s and slid to %s.',v_roll,v_next) else format('Rolled %s and moved to %s.',v_roll,v_next) end),true);
  if v_next=100 then v_next_state:=jsonb_set(v_next_state,'{winner}',to_jsonb(v_user::text),true); v_status:='finished'; else v_next_state:=jsonb_set(v_next_state,'{turn_user_id}',to_jsonb(case when v_roll=6 then v_user else v_other end),true); end if;
  insert into public.playground_game_intents(room_id,user_id,turn_no,action) values(p_room_id,v_user,v_room.turn_no+1,p_action) returning * into v_intent;
  update public.playground_rooms set turn_no=v_room.turn_no+1,state=v_next_state,status=v_status,finished_at=case when v_status='finished' then now() else finished_at end where id=p_room_id;
  return jsonb_build_object('accepted',true,'duplicate',false,'intent_id',v_intent.id,'turn_no',v_intent.turn_no,'status',v_status,'snapshot',public.playground_snake_ladder_snapshot(p_room_id));
end;
$fn$;

create or replace function public.settle_playground_snake_ladder_result()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_winner uuid:=nullif(new.state->>'winner','')::uuid; v_one uuid; v_two uuid; v_r1 public.playground_player_ratings; v_r2 public.playground_player_ratings; v_e1 numeric; v_new1 integer; v_new2 integer; v_k1 integer; v_k2 integer;
begin
  if new.status<>'finished' or old.status='finished' or new.game_key<>'snake_ladder' or v_winner is null then return new; end if;
  if exists(select 1 from public.playground_match_results where room_id=new.id) then return new; end if;
  select user_id into v_one from public.playground_room_members where room_id=new.id and seat_no=1; select user_id into v_two from public.playground_room_members where room_id=new.id and seat_no=2;
  if v_one is null or v_two is null then return new; end if;
  insert into public.playground_player_ratings(user_id,game_key) values(v_one,'snake_ladder'),(v_two,'snake_ladder') on conflict(user_id,game_key) do nothing;
  select * into v_r1 from public.playground_player_ratings where user_id=v_one and game_key='snake_ladder' for update; select * into v_r2 from public.playground_player_ratings where user_id=v_two and game_key='snake_ladder' for update;
  v_e1:=1/(1+power(10,(v_r2.rating-v_r1.rating)/400.0)); v_k1:=case when v_r1.games_played<20 then 32 else 16 end; v_k2:=case when v_r2.games_played<20 then 32 else 16 end;
  v_new1:=round(v_r1.rating+v_k1*((case when v_winner=v_one then 1 else 0 end)-v_e1)); v_new2:=round(v_r2.rating+v_k2*((case when v_winner=v_two then 1 else 0 end)-(1-v_e1)));
  update public.playground_player_ratings set rating=greatest(100,least(3000,v_new1)),games_played=games_played+1,wins=wins+case when v_winner=v_one then 1 else 0 end,losses=losses+case when v_winner<>v_one then 1 else 0 end,updated_at=now() where user_id=v_one and game_key='snake_ladder';
  update public.playground_player_ratings set rating=greatest(100,least(3000,v_new2)),games_played=games_played+1,wins=wins+case when v_winner=v_two then 1 else 0 end,losses=losses+case when v_winner<>v_two then 1 else 0 end,updated_at=now() where user_id=v_two and game_key='snake_ladder';
  insert into public.playground_match_results(room_id,game_key,result,winner_user_id,player_one_id,player_two_id,rating_snapshot) values(new.id,'snake_ladder','win',v_winner,v_one,v_two,jsonb_build_object('player_one_before',v_r1.rating,'player_one_after',v_new1,'player_two_before',v_r2.rating,'player_two_after',v_new2)) on conflict(room_id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists playground_settle_snake_ladder_result on public.playground_rooms;
create trigger playground_settle_snake_ladder_result after update of status on public.playground_rooms for each row when (new.game_key='snake_ladder') execute function public.settle_playground_snake_ladder_result();

create or replace function public.get_playground_rankings(p_game_key text, p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid:=auth.uid(); v_rows jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in('tic_tac_toe','memory_cards','connect_four','ludo','snake_ladder') then raise exception 'invalid_game_key' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('rank',rank_no,'player_code','Owl '||upper(substr(md5(user_id::text),1,6)),'rating',rating,'games_played',games_played,'wins',wins,'draws',draws,'losses',losses,'is_you',user_id=v_user_id) order by rank_no),'[]'::jsonb) into v_rows from (select row_number() over(order by rating desc,games_played desc,updated_at asc) as rank_no,user_id,rating,games_played,wins,draws,losses,updated_at from public.playground_player_ratings where game_key=p_game_key and games_played>0 order by rating desc,games_played desc,updated_at asc limit least(greatest(p_limit,1),100)) ranked;
  return jsonb_build_object('game_key',p_game_key,'rankings',v_rows);
end;
$fn$;

revoke all on function public.create_playground_room(text,text,integer) from public;
revoke all on function public.find_playground_match(text) from public;
revoke all on function public.playground_snake_ladder_step(integer,integer) from public;
revoke all on function public.playground_snake_ladder_snapshot(uuid) from public;
revoke all on function public.heartbeat_playground_snake_ladder(uuid) from public;
revoke all on function public.submit_playground_snake_ladder_intent(uuid,jsonb) from public;
revoke all on function public.settle_playground_snake_ladder_result() from public;
revoke all on function public.get_playground_rankings(text,integer) from public;
grant execute on function public.create_playground_room(text,text,integer) to authenticated;
grant execute on function public.find_playground_match(text) to authenticated;
grant execute on function public.playground_snake_ladder_snapshot(uuid) to authenticated;
grant execute on function public.heartbeat_playground_snake_ladder(uuid) to authenticated;
grant execute on function public.submit_playground_snake_ladder_intent(uuid,jsonb) to authenticated;
grant execute on function public.get_playground_rankings(text,integer) to authenticated;

comment on function public.submit_playground_snake_ladder_intent(uuid,jsonb) is 'Server-authoritative Snake & Ladder roll. The client cannot supply dice, positions, transitions, turn order, or winner state.';
comment on function public.playground_snake_ladder_snapshot(uuid) is 'Privacy-safe Snake & Ladder snapshot. Exposes seat positions and status but never auth IDs or internal player maps.';
