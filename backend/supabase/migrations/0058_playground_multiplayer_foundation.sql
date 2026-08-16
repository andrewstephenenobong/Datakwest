-- 0058_playground_multiplayer_foundation.sql
-- Playground multiplayer foundation. Client writes are intentionally blocked;
-- authenticated users submit intents through narrowly scoped RPCs.

create table if not exists public.playground_rooms (
  id uuid primary key default gen_random_uuid(),
  game_key text not null check (game_key in ('tic_tac_toe', 'memory_cards', 'owl_snake')),
  visibility text not null check (visibility in ('private', 'matchmaking', 'local')),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished', 'expired', 'cancelled')),
  host_id uuid not null references auth.users(id) on delete cascade,
  age_band text not null default '13_plus',
  guardian_controlled boolean not null default false,
  max_players integer not null default 2 check (max_players between 2 and 4),
  invite_code text unique,
  state jsonb not null default '{}'::jsonb,
  turn_no bigint not null default 0,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '2 hours',
  finished_at timestamptz
);

create table if not exists public.playground_room_members (
  room_id uuid not null references public.playground_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  seat_no integer not null check (seat_no between 1 and 4),
  status text not null default 'joined' check (status in ('joined', 'left', 'disconnected')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, seat_no)
);

create table if not exists public.playground_matchmaking_queue (
  user_id uuid primary key references auth.users(id) on delete cascade,
  game_key text not null check (game_key in ('tic_tac_toe', 'memory_cards', 'owl_snake')),
  age_band text not null default '13_plus',
  guardian_controlled boolean not null default false,
  queued_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes'
);

create table if not exists public.playground_game_intents (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.playground_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  turn_no bigint not null,
  action jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.playground_reactions (
  id bigint generated always as identity primary key,
  room_id uuid not null references public.playground_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_key text not null check (reaction_key in ('good_move', 'well_played', 'good_try', 'rematch', 'owl_wave', 'celebrate')),
  created_at timestamptz not null default now()
);

create index if not exists playground_rooms_status_idx on public.playground_rooms(status, game_key, created_at desc);
create index if not exists playground_room_members_user_idx on public.playground_room_members(user_id, status);
create index if not exists playground_queue_match_idx on public.playground_matchmaking_queue(game_key, age_band, queued_at);
create index if not exists playground_intents_room_idx on public.playground_game_intents(room_id, turn_no, created_at);
create index if not exists playground_reactions_room_idx on public.playground_reactions(room_id, created_at desc);

alter table public.playground_rooms enable row level security;
alter table public.playground_room_members enable row level security;
alter table public.playground_matchmaking_queue enable row level security;
alter table public.playground_game_intents enable row level security;
alter table public.playground_reactions enable row level security;

-- No direct table writes. Room visibility is mediated by RPCs and membership checks.
revoke all on table public.playground_rooms from anon, authenticated;
revoke all on table public.playground_room_members from anon, authenticated;
revoke all on table public.playground_matchmaking_queue from anon, authenticated;
revoke all on table public.playground_game_intents from anon, authenticated;
revoke all on table public.playground_reactions from anon, authenticated;

create or replace function public.create_playground_room(
  p_game_key text,
  p_visibility text default 'private',
  p_max_players integer default 2
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_pref public.learner_preferences;
  v_room public.playground_rooms;
  v_invite text;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_game_key not in ('tic_tac_toe', 'memory_cards', 'owl_snake') then raise exception 'invalid_game_key' using errcode = '22023'; end if;
  if p_visibility not in ('private', 'matchmaking', 'local') then raise exception 'invalid_room_visibility' using errcode = '22023'; end if;
  if p_max_players not between 2 and 4 then raise exception 'invalid_player_limit' using errcode = '22023'; end if;

  select * into v_pref from public.learner_preferences where learner_id = v_user_id;
  v_invite := case when p_visibility = 'private' then upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 10)) else null end;
  insert into public.playground_rooms(game_key, visibility, host_id, age_band, guardian_controlled, max_players, invite_code)
  values (p_game_key, p_visibility, v_user_id, coalesce(v_pref.age_band, '13_plus'), coalesce(v_pref.guardian_controlled, false), p_max_players, v_invite)
  returning * into v_room;

  insert into public.playground_room_members(room_id, user_id, seat_no)
  values (v_room.id, v_user_id, 1);

  return jsonb_build_object('room_id', v_room.id, 'game_key', v_room.game_key, 'visibility', v_room.visibility, 'invite_code', v_room.invite_code, 'status', v_room.status, 'max_players', v_room.max_players);
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
  update public.playground_rooms set status = case when v_seat >= 2 then 'active' else status end where id = v_room.id;
  return jsonb_build_object('room_id', v_room.id, 'game_key', v_room.game_key, 'status', case when v_seat >= 2 then 'active' else v_room.status end, 'seat_no', v_seat);
end;
$$;

create or replace function public.queue_playground_match(p_game_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_user_id uuid := auth.uid();
  v_pref public.learner_preferences;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_game_key not in ('tic_tac_toe', 'memory_cards') then raise exception 'matchmaking_not_available_for_game' using errcode = '22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id = v_user_id;
  insert into public.playground_matchmaking_queue(user_id, game_key, age_band, guardian_controlled)
  values (v_user_id, p_game_key, coalesce(v_pref.age_band, '13_plus'), coalesce(v_pref.guardian_controlled, false))
  on conflict (user_id) do update set game_key = excluded.game_key, age_band = excluded.age_band, guardian_controlled = excluded.guardian_controlled, queued_at = now(), expires_at = now() + interval '10 minutes';
  return jsonb_build_object('queued', true, 'game_key', p_game_key, 'age_band', coalesce(v_pref.age_band, '13_plus'));
end;
$$;

create or replace function public.leave_playground_matchmaking()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  delete from public.playground_matchmaking_queue where user_id = v_user_id;
  return jsonb_build_object('queued', false);
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
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_action is null or jsonb_typeof(p_action) <> 'object' or octet_length(p_action::text) > 4000 then raise exception 'invalid_game_action' using errcode = '22023'; end if;
  select * into v_room from public.playground_rooms where id = p_room_id and status = 'active' for update;
  if not found then raise exception 'room_not_active' using errcode = '22023'; end if;
  select * into v_member from public.playground_room_members where room_id = p_room_id and user_id = v_user_id and status = 'joined';
  if not found then raise exception 'not_room_member' using errcode = '42501'; end if;
  insert into public.playground_game_intents(room_id, user_id, turn_no, action) values (p_room_id, v_user_id, v_room.turn_no + 1, p_action) returning * into v_intent;
  update public.playground_rooms set turn_no = v_room.turn_no + 1, state = jsonb_build_object('last_intent_id', v_intent.id, 'last_action', p_action, 'last_actor', v_user_id) where id = p_room_id;
  return jsonb_build_object('accepted', true, 'intent_id', v_intent.id, 'turn_no', v_intent.turn_no);
end;
$$;

create or replace function public.send_playground_reaction(p_room_id uuid, p_reaction_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if p_reaction_key not in ('good_move', 'well_played', 'good_try', 'rematch', 'owl_wave', 'celebrate') then raise exception 'invalid_reaction' using errcode = '22023'; end if;
  if not exists (select 1 from public.playground_room_members where room_id = p_room_id and user_id = v_user_id and status = 'joined') then raise exception 'not_room_member' using errcode = '42501'; end if;
  insert into public.playground_reactions(room_id, user_id, reaction_key) values (p_room_id, v_user_id, p_reaction_key);
  return jsonb_build_object('accepted', true, 'reaction_key', p_reaction_key);
end;
$$;

revoke all on function public.create_playground_room(text, text, integer) from public;
revoke all on function public.join_playground_room(text) from public;
revoke all on function public.queue_playground_match(text) from public;
revoke all on function public.leave_playground_matchmaking() from public;
revoke all on function public.submit_playground_intent(uuid, jsonb) from public;
revoke all on function public.send_playground_reaction(uuid, text) from public;
grant execute on function public.create_playground_room(text, text, integer) to authenticated;
grant execute on function public.join_playground_room(text) to authenticated;
grant execute on function public.queue_playground_match(text) to authenticated;
grant execute on function public.leave_playground_matchmaking() to authenticated;
grant execute on function public.submit_playground_intent(uuid, jsonb) to authenticated;
grant execute on function public.send_playground_reaction(uuid, text) to authenticated;

comment on table public.playground_game_intents is 'Append-only server-accepted intents. Game-specific state validation and settlement must be added before online competitive play is enabled.';
comment on table public.playground_reactions is 'Preset social reactions only; open chat is intentionally excluded from the Playground MVP.';
