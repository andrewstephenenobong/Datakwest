-- 0066_playground_ratings_elo.sql
-- Server-managed ratings and privacy-safe anonymous rankings.

create table if not exists public.playground_player_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null check (game_key in ('tic_tac_toe','memory_cards','connect_four')),
  rating integer not null default 1200 check (rating between 100 and 3000),
  games_played integer not null default 0 check (games_played >= 0),
  wins integer not null default 0 check (wins >= 0),
  draws integer not null default 0 check (draws >= 0),
  losses integer not null default 0 check (losses >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_key)
);

create table if not exists public.playground_match_results (
  room_id uuid primary key references public.playground_rooms(id) on delete cascade,
  game_key text not null,
  result text not null check (result in ('win','draw')),
  winner_user_id uuid references auth.users(id) on delete set null,
  player_one_id uuid not null references auth.users(id) on delete cascade,
  player_two_id uuid not null references auth.users(id) on delete cascade,
  rating_snapshot jsonb not null default '{}'::jsonb,
  settled_at timestamptz not null default now()
);

alter table public.playground_player_ratings enable row level security;
alter table public.playground_match_results enable row level security;
revoke all on table public.playground_player_ratings from anon, authenticated;
revoke all on table public.playground_match_results from anon, authenticated;
create policy playground_ratings_deny_direct_access on public.playground_player_ratings for all to authenticated using (false) with check (false);
create policy playground_results_deny_direct_access on public.playground_match_results for all to authenticated using (false) with check (false);

alter table public.playground_matchmaking_queue add column if not exists rating integer not null default 1200;
alter table public.playground_matchmaking_queue add column if not exists rating_window integer not null default 100 check (rating_window between 50 and 400);

create or replace function public.playground_rating_for(p_user_id uuid, p_game_key text)
returns integer language sql stable security definer set search_path = public, pg_catalog as $$
  select coalesce((select rating from public.playground_player_ratings where user_id=p_user_id and game_key=p_game_key),1200);
$$;

create or replace function public.find_playground_match(p_game_key text)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid := auth.uid(); v_pref public.learner_preferences; v_opponent public.playground_matchmaking_queue; v_room public.playground_rooms; v_state jsonb; v_age_band text; v_guardian_controlled boolean; v_rating integer; v_window integer;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in ('tic_tac_toe','memory_cards','connect_four') then raise exception 'matchmaking_not_available_for_game' using errcode='22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id=v_user_id;
  v_age_band:=coalesce(v_pref.age_band,'13_plus'); v_guardian_controlled:=coalesce(v_pref.guardian_controlled,false); v_rating:=public.playground_rating_for(v_user_id,p_game_key);
  perform pg_advisory_xact_lock(hashtext('datakwest_playground:'||p_game_key||':'||v_age_band||':'||v_guardian_controlled::text));
  delete from public.playground_matchmaking_queue where expires_at <= now();
  if not exists (select 1 from public.playground_matchmaking_queue where user_id=v_user_id and game_key=p_game_key and expires_at > now()) then
    insert into public.playground_matchmaking_queue(user_id,game_key,age_band,guardian_controlled,rating,rating_window) values (v_user_id,p_game_key,v_age_band,v_guardian_controlled,v_rating,100)
    on conflict (user_id) do update set game_key=excluded.game_key,age_band=excluded.age_band,guardian_controlled=excluded.guardian_controlled,rating=excluded.rating,queued_at=now(),expires_at=now()+interval '10 minutes';
  end if;
  update public.playground_matchmaking_queue set rating_window=least(400,100+greatest(0,floor(extract(epoch from (now()-queued_at))/30)::integer)*50) where game_key=p_game_key and age_band=v_age_band and guardian_controlled=v_guardian_controlled and expires_at > now();
  select * into v_opponent from public.playground_matchmaking_queue where user_id<>v_user_id and game_key=p_game_key and age_band=v_age_band and guardian_controlled=v_guardian_controlled and expires_at > now() and abs(rating-v_rating) <= rating_window order by queued_at,user_id limit 1 for update skip locked;
  if not found then return jsonb_build_object('matched',false,'queued',true,'game_key',p_game_key,'rating',v_rating,'rating_window',coalesce((select rating_window from public.playground_matchmaking_queue where user_id=v_user_id),100)); end if;
  v_state:=public.playground_initial_state(p_game_key,v_user_id,v_opponent.user_id);
  insert into public.playground_rooms(game_key,visibility,status,host_id,age_band,guardian_controlled,max_players,state) values (p_game_key,'matchmaking','active',v_user_id,v_age_band,v_guardian_controlled,2,v_state) returning * into v_room;
  insert into public.playground_room_members(room_id,user_id,seat_no) values (v_room.id,v_user_id,1),(v_room.id,v_opponent.user_id,2);
  delete from public.playground_matchmaking_queue where user_id in (v_user_id,v_opponent.user_id);
  return jsonb_build_object('matched',true,'queued',false,'room_id',v_room.id,'game_key',p_game_key,'status',v_room.status,'rating_gap',abs(v_rating-v_opponent.rating));
end;
$$;

create or replace function public.settle_playground_match_result()
returns trigger language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_player_one uuid; v_player_two uuid; v_winner uuid; v_result text; v_one public.playground_player_ratings; v_two public.playground_player_ratings; v_expected_one numeric; v_expected_two numeric; v_new_one integer; v_new_two integer; v_k_one integer; v_k_two integer; v_winner_symbol text;
begin
  if new.status <> 'finished' or old.status = 'finished' then return new; end if;
  select user_id into v_player_one from public.playground_room_members where room_id=new.id and seat_no=1;
  select user_id into v_player_two from public.playground_room_members where room_id=new.id and seat_no=2;
  if v_player_one is null or v_player_two is null then return new; end if;
  if new.state->>'winner' = 'draw' then v_result:='draw'; elsif new.state->>'winner' in ('X','O') then v_winner_symbol:=new.state->>'winner'; v_winner:=case when v_winner_symbol='X' then v_player_one else v_player_two end; v_result:='win'; elsif new.game_key='memory_cards' and nullif(new.state->>'winner','') is not null then v_winner:=nullif(new.state->>'winner','')::uuid; v_result:='win'; else return new; end if;
  insert into public.playground_player_ratings(user_id,game_key) values (v_player_one,new.game_key),(v_player_two,new.game_key) on conflict (user_id,game_key) do nothing;
  select * into v_one from public.playground_player_ratings where user_id=v_player_one and game_key=new.game_key for update;
  select * into v_two from public.playground_player_ratings where user_id=v_player_two and game_key=new.game_key for update;
  v_expected_one:=1/(1+power(10,(v_two.rating-v_one.rating)/400.0)); v_expected_two:=1-v_expected_one; v_k_one:=case when v_one.games_played < 20 then 32 else 16 end; v_k_two:=case when v_two.games_played < 20 then 32 else 16 end;
  if v_result='draw' then v_new_one:=round(v_one.rating+v_k_one*(0.5-v_expected_one)); v_new_two:=round(v_two.rating+v_k_two*(0.5-v_expected_two)); else v_new_one:=round(v_one.rating+v_k_one*((case when v_winner=v_player_one then 1 else 0 end)-v_expected_one)); v_new_two:=round(v_two.rating+v_k_two*((case when v_winner=v_player_two then 1 else 0 end)-v_expected_two)); end if;
  update public.playground_player_ratings set rating=greatest(100,least(3000,v_new_one)),games_played=games_played+1,wins=wins+case when v_winner=v_player_one then 1 else 0 end,draws=draws+case when v_result='draw' then 1 else 0 end,losses=losses+case when v_result='win' and v_winner<>v_player_one then 1 else 0 end,updated_at=now() where user_id=v_player_one and game_key=new.game_key;
  update public.playground_player_ratings set rating=greatest(100,least(3000,v_new_two)),games_played=games_played+1,wins=wins+case when v_winner=v_player_two then 1 else 0 end,draws=draws+case when v_result='draw' then 1 else 0 end,losses=losses+case when v_result='win' and v_winner<>v_player_two then 1 else 0 end,updated_at=now() where user_id=v_player_two and game_key=new.game_key;
  insert into public.playground_match_results(room_id,game_key,result,winner_user_id,player_one_id,player_two_id,rating_snapshot) values (new.id,new.game_key,v_result,v_winner,v_player_one,v_player_two,jsonb_build_object('player_one_before',v_one.rating,'player_one_after',v_new_one,'player_two_before',v_two.rating,'player_two_after',v_new_two)) on conflict (room_id) do nothing;
  return new;
end;
$$;

drop trigger if exists playground_settle_result on public.playground_rooms;
create trigger playground_settle_result after update of status on public.playground_rooms for each row execute function public.settle_playground_match_result();

create or replace function public.get_playground_rankings(p_game_key text, p_limit integer default 25)
returns jsonb language plpgsql stable security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid:=auth.uid(); v_rows jsonb;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  if p_game_key not in ('tic_tac_toe','memory_cards','connect_four') then raise exception 'invalid_game_key' using errcode='22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('rank',rank_no,'player_code','Owl '||upper(substr(md5(user_id::text),1,6)),'rating',rating,'games_played',games_played,'wins',wins,'draws',draws,'losses',losses,'is_you',user_id=v_user_id) order by rank_no),'[]'::jsonb) into v_rows from (select row_number() over(order by rating desc,games_played desc,updated_at asc) as rank_no,user_id,rating,games_played,wins,draws,losses,updated_at from public.playground_player_ratings where game_key=p_game_key and games_played > 0 order by rating desc,games_played desc,updated_at asc limit least(greatest(p_limit,1),100)) ranked;
  return jsonb_build_object('game_key',p_game_key,'rankings',v_rows);
end;
$$;

revoke all on function public.playground_rating_for(uuid,text) from public;
revoke all on function public.find_playground_match(text) from public;
revoke all on function public.settle_playground_match_result() from public;
revoke all on function public.get_playground_rankings(text,integer) from public;
grant execute on function public.find_playground_match(text) to authenticated;
grant execute on function public.get_playground_rankings(text,integer) to authenticated;

comment on table public.playground_player_ratings is 'Server-managed per-game ratings. Direct client access is denied; updates happen only after settled server results.';
comment on function public.find_playground_match(text) is 'Age-scoped and guardian-scoped matchmaking with a bounded, wait-time-widened ELO rating window.';
comment on function public.get_playground_rankings(text,integer) is 'Returns anonymous Owl player codes and ratings without exposing auth identity.';
