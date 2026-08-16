-- 0073_playground_ludo_matchmaking_ratings.sql
-- Public four-player Ludo matchmaking and placement-based ratings.
-- Existing two-player Playground games keep their current rating behavior.

alter table public.playground_player_ratings drop constraint if exists playground_player_ratings_game_key_check;
alter table public.playground_player_ratings add constraint playground_player_ratings_game_key_check check (game_key in ('tic_tac_toe','memory_cards','connect_four','ludo'));

create table if not exists public.playground_ludo_match_results (
  room_id uuid primary key references public.playground_rooms(id) on delete cascade,
  placements jsonb not null,
  rating_snapshot jsonb not null default '{}'::jsonb,
  settled_at timestamptz not null default now()
);
alter table public.playground_ludo_match_results enable row level security;
revoke all on table public.playground_ludo_match_results from anon, authenticated;
drop policy if exists playground_ludo_results_deny_direct_access on public.playground_ludo_match_results;
create policy playground_ludo_results_deny_direct_access on public.playground_ludo_match_results for all to authenticated using (false) with check (false);

create or replace function public.find_playground_match(p_game_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid:=auth.uid(); v_pref public.learner_preferences; v_opponent record; v_room public.playground_rooms; v_state jsonb; v_age_band text; v_guardian boolean; v_rating integer; v_window integer; v_opponents uuid[]; v_player_ids uuid[]; v_count integer;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in ('tic_tac_toe','memory_cards','connect_four','ludo') then raise exception 'matchmaking_not_available_for_game' using errcode='22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id=v_user_id;
  v_age_band:=coalesce(v_pref.age_band,'13_plus'); v_guardian:=coalesce(v_pref.guardian_controlled,false); v_rating:=public.playground_rating_for(v_user_id,p_game_key);
  perform pg_advisory_xact_lock(hashtext('datakwest_playground:'||p_game_key||':'||v_age_band||':'||v_guardian::text));
  delete from public.playground_matchmaking_queue where expires_at<=now();
  if not exists(select 1 from public.playground_matchmaking_queue where user_id=v_user_id and game_key=p_game_key and expires_at>now()) then
    insert into public.playground_matchmaking_queue(user_id,game_key,age_band,guardian_controlled,rating,rating_window) values(v_user_id,p_game_key,v_age_band,v_guardian,v_rating,100)
    on conflict(user_id) do update set game_key=excluded.game_key,age_band=excluded.age_band,guardian_controlled=excluded.guardian_controlled,rating=excluded.rating,queued_at=now(),expires_at=now()+interval '10 minutes';
  end if;
  update public.playground_matchmaking_queue set rating_window=least(400,100+greatest(0,floor(extract(epoch from(now()-queued_at))/30)::integer)*50) where game_key=p_game_key and age_band=v_age_band and guardian_controlled=v_guardian and expires_at>now();
  if p_game_key='ludo' then
    select coalesce(array_agg(user_id order by queued_at,user_id),'{}'::uuid[]) into v_opponents from public.playground_matchmaking_queue where user_id<>v_user_id and game_key='ludo' and age_band=v_age_band and guardian_controlled=v_guardian and expires_at>now() and abs(rating-v_rating)<=rating_window limit 3;
    v_count:=coalesce(array_length(v_opponents,1),0);
    if v_count<3 then return jsonb_build_object('matched',false,'queued',true,'game_key',p_game_key,'players_waiting',v_count+1,'players_needed',4,'rating',v_rating,'rating_window',coalesce((select rating_window from public.playground_matchmaking_queue where user_id=v_user_id),100)); end if;
    v_player_ids:=array_prepend(v_user_id,v_opponents);
    insert into public.playground_rooms(game_key,visibility,status,host_id,age_band,guardian_controlled,max_players,state) values('ludo','matchmaking','active',v_user_id,v_age_band,v_guardian,4,'{}'::jsonb) returning * into v_room;
    insert into public.playground_room_members(room_id,user_id,seat_no) values(v_room.id,v_player_ids[1],1),(v_room.id,v_player_ids[2],2),(v_room.id,v_player_ids[3],3),(v_room.id,v_player_ids[4],4);
    v_state:=public.playground_ludo_initial_state(v_room.id); update public.playground_rooms set state=v_state where id=v_room.id;
    delete from public.playground_matchmaking_queue where user_id=any(v_player_ids);
    return jsonb_build_object('matched',true,'queued',false,'room_id',v_room.id,'game_key','ludo','status','active','players_joined',4,'players_needed',4);
  end if;
  select q.user_id,q.rating into v_opponent from public.playground_matchmaking_queue q where q.user_id<>v_user_id and q.game_key=p_game_key and q.age_band=v_age_band and q.guardian_controlled=v_guardian and q.expires_at>now() and abs(q.rating-v_rating)<=q.rating_window order by q.queued_at,q.user_id limit 1 for update skip locked;
  if not found then return jsonb_build_object('matched',false,'queued',true,'game_key',p_game_key,'rating',v_rating,'rating_window',coalesce((select rating_window from public.playground_matchmaking_queue where user_id=v_user_id),100)); end if;
  v_state:=public.playground_initial_state(p_game_key,v_user_id,v_opponent.user_id);
  insert into public.playground_rooms(game_key,visibility,status,host_id,age_band,guardian_controlled,max_players,state) values(p_game_key,'matchmaking','active',v_user_id,v_age_band,v_guardian,2,v_state) returning * into v_room;
  insert into public.playground_room_members(room_id,user_id,seat_no) values(v_room.id,v_user_id,1),(v_room.id,v_opponent.user_id,2);
  delete from public.playground_matchmaking_queue where user_id in(v_user_id,v_opponent.user_id);
  return jsonb_build_object('matched',true,'queued',false,'room_id',v_room.id,'game_key',p_game_key,'status',v_room.status,'rating_gap',abs(v_rating-v_opponent.rating));
end;
$fn$;

create or replace function public.settle_playground_ludo_result(p_room public.playground_rooms)
returns void language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_winners uuid[]; v_players uuid[]; v_ordered uuid[]; v_user uuid; v_opponent_user uuid; v_place integer; v_rating public.playground_player_ratings; v_opponent public.playground_player_ratings; v_before jsonb:='{}'::jsonb; v_after jsonb:='{}'::jsonb; v_expected numeric; v_score numeric; v_new integer; v_k integer; v_sum numeric; v_count integer;
begin
  if p_room.game_key<>'ludo' or p_room.status<>'finished' then return; end if;
  if exists(select 1 from public.playground_ludo_match_results where room_id=p_room.id) then return; end if;
  select array_agg((item #>> '{}')::uuid order by ord) into v_winners from jsonb_array_elements(coalesce(p_room.state->'winner_order','[]'::jsonb)) with ordinality as x(item,ord);
  select array_agg(user_id order by seat_no) into v_players from public.playground_room_members where room_id=p_room.id and status<>'left';
  if coalesce(array_length(v_players,1),0)<>4 or coalesce(array_length(v_winners,1),0)<3 then return; end if;
  v_ordered:=v_winners;
  foreach v_user in array v_players loop if not v_user=any(v_ordered) then v_ordered:=array_append(v_ordered,v_user); end if; end loop;
  v_place:=1;
  foreach v_user in array v_ordered loop
    insert into public.playground_player_ratings(user_id,game_key) values(v_user,'ludo') on conflict(user_id,game_key) do nothing;
    select * into v_rating from public.playground_player_ratings where user_id=v_user and game_key='ludo' for update;
    v_before:=jsonb_set(v_before,array[v_user::text],to_jsonb(v_rating.rating),true);
    v_sum:=0; v_count:=0;
    foreach v_opponent_user in array v_ordered loop
      if v_opponent_user<>v_user then
        select * into v_opponent from public.playground_player_ratings where user_id=v_opponent_user and game_key='ludo';
        v_expected:=1/(1+power(10,(v_opponent.rating-v_rating.rating)/400.0)); v_sum:=v_sum+v_expected; v_count:=v_count+1;
      end if;
    end loop;
    v_expected:=case when v_count=0 then 0.5 else v_sum/v_count end;
    v_score:=case v_place when 1 then 1.0 when 2 then 0.67 when 3 then 0.33 else 0.0 end;
    v_k:=case when v_rating.games_played<20 then 32 else 16 end;
    v_new:=greatest(100,least(3000,round(v_rating.rating+v_k*(v_score-v_expected))));
    update public.playground_player_ratings set rating=v_new,games_played=games_played+1,wins=wins+case when v_place=1 then 1 else 0 end,draws=draws+case when v_place in(2,3) then 0 else 0 end,losses=losses+case when v_place>1 then 1 else 0 end,updated_at=now() where user_id=v_user and game_key='ludo';
    v_after:=jsonb_set(v_after,array[v_user::text],jsonb_build_object('place',v_place,'rating',v_new),true); v_place:=v_place+1;
  end loop;
  insert into public.playground_ludo_match_results(room_id,placements,rating_snapshot) values(p_room.id,to_jsonb(v_ordered),jsonb_build_object('before',v_before,'after',v_after)) on conflict(room_id) do nothing;
end;
$fn$;

create or replace function public.settle_playground_match_result()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_player_one uuid; v_player_two uuid; v_winner uuid; v_result text; v_one public.playground_player_ratings; v_two public.playground_player_ratings; v_expected_one numeric; v_expected_two numeric; v_new_one integer; v_new_two integer; v_k_one integer; v_k_two integer; v_winner_symbol text;
begin
  if new.status<>'finished' or old.status='finished' then return new; end if;
  if new.game_key='ludo' then perform public.settle_playground_ludo_result(new); return new; end if;
  select user_id into v_player_one from public.playground_room_members where room_id=new.id and seat_no=1; select user_id into v_player_two from public.playground_room_members where room_id=new.id and seat_no=2; if v_player_one is null or v_player_two is null then return new; end if;
  if new.state->>'winner'='draw' then v_result:='draw'; elsif new.state->>'winner' in('X','O') then v_winner_symbol:=new.state->>'winner'; v_winner:=case when v_winner_symbol='X' then v_player_one else v_player_two end; v_result:='win'; elsif new.game_key='memory_cards' and nullif(new.state->>'winner','') is not null then v_winner:=nullif(new.state->>'winner','')::uuid; v_result:='win'; else return new; end if;
  insert into public.playground_player_ratings(user_id,game_key) values(v_player_one,new.game_key),(v_player_two,new.game_key) on conflict(user_id,game_key) do nothing;
  select * into v_one from public.playground_player_ratings where user_id=v_player_one and game_key=new.game_key for update; select * into v_two from public.playground_player_ratings where user_id=v_player_two and game_key=new.game_key for update;
  v_expected_one:=1/(1+power(10,(v_two.rating-v_one.rating)/400.0)); v_expected_two:=1-v_expected_one; v_k_one:=case when v_one.games_played<20 then 32 else 16 end; v_k_two:=case when v_two.games_played<20 then 32 else 16 end;
  if v_result='draw' then v_new_one:=round(v_one.rating+v_k_one*(0.5-v_expected_one)); v_new_two:=round(v_two.rating+v_k_two*(0.5-v_expected_two)); else v_new_one:=round(v_one.rating+v_k_one*((case when v_winner=v_player_one then 1 else 0 end)-v_expected_one)); v_new_two:=round(v_two.rating+v_k_two*((case when v_winner=v_player_two then 1 else 0 end)-v_expected_two)); end if;
  update public.playground_player_ratings set rating=greatest(100,least(3000,v_new_one)),games_played=games_played+1,wins=wins+case when v_winner=v_player_one then 1 else 0 end,draws=draws+case when v_result='draw' then 1 else 0 end,losses=losses+case when v_result='win' and v_winner<>v_player_one then 1 else 0 end,updated_at=now() where user_id=v_player_one and game_key=new.game_key;
  update public.playground_player_ratings set rating=greatest(100,least(3000,v_new_two)),games_played=games_played+1,wins=wins+case when v_winner=v_player_two then 1 else 0 end,draws=draws+case when v_result='draw' then 1 else 0 end,losses=losses+case when v_result='win' and v_winner<>v_player_two then 1 else 0 end,updated_at=now() where user_id=v_player_two and game_key=new.game_key;
  insert into public.playground_match_results(room_id,game_key,result,winner_user_id,player_one_id,player_two_id,rating_snapshot) values(new.id,new.game_key,v_result,v_winner,v_player_one,v_player_two,jsonb_build_object('player_one_before',v_one.rating,'player_one_after',v_new_one,'player_two_before',v_two.rating,'player_two_after',v_new_two)) on conflict(room_id) do nothing;
  return new;
end;
$fn$;

drop trigger if exists playground_settle_result on public.playground_rooms;
create trigger playground_settle_result after update of status on public.playground_rooms for each row execute function public.settle_playground_match_result();

create or replace function public.get_playground_rankings(p_game_key text, p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = public, pg_catalog as $fn$
declare v_user_id uuid:=auth.uid(); v_rows jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in('tic_tac_toe','memory_cards','connect_four','ludo') then raise exception 'invalid_game_key' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('rank',rank_no,'player_code','Owl '||upper(substr(md5(user_id::text),1,6)),'rating',rating,'games_played',games_played,'wins',wins,'draws',draws,'losses',losses,'is_you',user_id=v_user_id) order by rank_no),'[]'::jsonb) into v_rows from (select row_number() over(order by rating desc,games_played desc,updated_at asc) as rank_no,user_id,rating,games_played,wins,draws,losses,updated_at from public.playground_player_ratings where game_key=p_game_key and games_played>0 order by rating desc,games_played desc,updated_at asc limit least(greatest(p_limit,1),100)) ranked;
  return jsonb_build_object('game_key',p_game_key,'rankings',v_rows);
end;
$fn$;

revoke all on function public.find_playground_match(text) from public;
revoke all on function public.settle_playground_ludo_result(public.playground_rooms) from public;
revoke all on function public.settle_playground_match_result() from public;
revoke all on function public.get_playground_rankings(text,integer) from public;
grant execute on function public.find_playground_match(text) to authenticated;
grant execute on function public.get_playground_rankings(text,integer) to authenticated;

comment on function public.find_playground_match(text) is 'Age-scoped, guardian-scoped matchmaking. Ludo forms four-player rooms; other games remain two-player.';
comment on function public.settle_playground_ludo_result(public.playground_rooms) is 'Idempotent four-player placement rating settlement for Ludo.';
