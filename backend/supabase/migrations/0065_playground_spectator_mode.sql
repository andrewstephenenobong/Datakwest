-- 0065_playground_spectator_mode.sql
-- Privacy-safe spectator mode for ongoing games. No identity, invite code,
-- age-band, or hidden-information leakage is exposed to spectators.

alter table public.playground_rooms add column if not exists spectators_enabled boolean not null default false;
alter table public.playground_rooms add column if not exists max_spectators integer not null default 8 check (max_spectators between 0 and 20);

create table if not exists public.playground_spectator_sessions (
  room_id uuid not null references public.playground_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'watching' check (status in ('watching','left','disconnected')),
  joined_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists playground_spectators_room_idx on public.playground_spectator_sessions(room_id, status, last_seen_at desc);
alter table public.playground_spectator_sessions enable row level security;
revoke all on table public.playground_spectator_sessions from anon, authenticated;
create policy playground_spectator_sessions_deny_direct_access on public.playground_spectator_sessions for all to authenticated using (false) with check (false);

create or replace function public.playground_public_state(p_room public.playground_rooms, p_viewer uuid default null, p_relative boolean default false)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_state jsonb := p_room.state; v_masked_deck jsonb := jsonb_build_array(null,null,null,null,null,null,null,null); v_index integer; v_visible boolean; v_revealed jsonb; v_matched jsonb; v_you_symbol text; v_turn_user uuid;
begin
  if p_room.game_key in ('tic_tac_toe','connect_four') then
    v_you_symbol := case when p_relative and p_viewer is not null then p_room.state->'players'->>p_viewer::text else null end;
    v_state := v_state - 'players';
    if p_relative then v_state := jsonb_set(v_state,'{you_symbol}',coalesce(to_jsonb(v_you_symbol),'null'::jsonb),true); v_state := jsonb_set(v_state,'{your_turn}',to_jsonb(p_room.state->>'next_symbol'=v_you_symbol),true); end if;
  elsif p_room.game_key = 'memory_cards' then
    v_revealed := coalesce(p_room.state->'revealed','[]'::jsonb); v_matched := coalesce(p_room.state->'matched','[]'::jsonb);
    for v_index in 0..7 loop
      v_visible := v_index = any(array(select jsonb_array_elements_text(v_revealed)::integer)) or v_index = any(array(select jsonb_array_elements_text(v_matched)::integer));
      if v_visible then v_masked_deck := jsonb_set(v_masked_deck,array[v_index::text],p_room.state->'deck'->v_index,true); end if;
    end loop;
    v_state := jsonb_set(v_state,'{deck}',v_masked_deck,true);
    v_turn_user := nullif(p_room.state->>'turn_user_id','')::uuid;
    v_state := v_state - 'turn_user_id' - 'players';
    if p_relative then v_state := jsonb_set(v_state,'{your_turn}',to_jsonb(v_turn_user=p_viewer),true); end if;
  end if;
  return v_state;
end;
$$;

create or replace function public.set_playground_spectator_mode(p_room_id uuid, p_enabled boolean)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid := auth.uid(); v_room public.playground_rooms;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select * into v_room from public.playground_rooms where id=p_room_id for update;
  if not found then raise exception 'room_unavailable' using errcode='22023'; end if;
  if v_room.host_id <> v_user_id then raise exception 'only_host_can_set_spectators' using errcode='42501'; end if;
  if v_room.guardian_controlled and p_enabled then raise exception 'spectators_disabled_for_guardian_controlled_room' using errcode='42501'; end if;
  update public.playground_rooms set spectators_enabled=p_enabled where id=p_room_id;
  if not p_enabled then update public.playground_spectator_sessions set status='left',last_seen_at=now() where room_id=p_room_id and status <> 'left'; end if;
  return jsonb_build_object('room_id',p_room_id,'spectators_enabled',p_enabled);
end;
$$;

create or replace function public.join_playground_spectator(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid := auth.uid(); v_room public.playground_rooms; v_pref public.learner_preferences; v_count integer;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select * into v_room from public.playground_rooms where id=p_room_id and status='active' and expires_at > now();
  if not found then raise exception 'room_unavailable' using errcode='22023'; end if;
  if not v_room.spectators_enabled then raise exception 'spectators_not_enabled' using errcode='42501'; end if;
  if exists (select 1 from public.playground_room_members where room_id=p_room_id and user_id=v_user_id) then raise exception 'members_cannot_join_as_spectators' using errcode='22023'; end if;
  select * into v_pref from public.learner_preferences where learner_id=v_user_id;
  if coalesce(v_pref.age_band,'13_plus') <> v_room.age_band or coalesce(v_pref.guardian_controlled,false) <> v_room.guardian_controlled then raise exception 'spectator_age_scope_mismatch' using errcode='42501'; end if;
  select count(*) into v_count from public.playground_spectator_sessions where room_id=p_room_id and status='watching';
  if v_count >= v_room.max_spectators then raise exception 'spectator_limit_reached' using errcode='22023'; end if;
  insert into public.playground_spectator_sessions(room_id,user_id,status) values (p_room_id,v_user_id,'watching') on conflict (room_id,user_id) do update set status='watching',last_seen_at=now();
  return jsonb_build_object('joined',true,'room_id',p_room_id);
end;
$$;

create or replace function public.leave_playground_spectator(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  update public.playground_spectator_sessions set status='left',last_seen_at=now() where room_id=p_room_id and user_id=v_user_id and status <> 'left';
  if not found then raise exception 'not_spectator' using errcode='42501'; end if;
  return jsonb_build_object('left',true,'room_id',p_room_id);
end;
$$;

create or replace function public.playground_spectator_snapshot(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $$
declare v_user_id uuid := auth.uid(); v_room public.playground_rooms; v_member_count integer; v_spectator_count integer;
begin
  if v_user_id is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  select * into v_room from public.playground_rooms where id=p_room_id and status in ('active','finished') and expires_at > now();
  if not found then raise exception 'room_unavailable' using errcode='22023'; end if;
  if not exists (select 1 from public.playground_spectator_sessions where room_id=p_room_id and user_id=v_user_id and status='watching') then raise exception 'not_spectator' using errcode='42501'; end if;
  update public.playground_spectator_sessions set last_seen_at=now() where room_id=p_room_id and user_id=v_user_id;
  update public.playground_spectator_sessions set status='disconnected' where room_id=p_room_id and status='watching' and last_seen_at < now()-interval '90 seconds';
  select count(*) into v_member_count from public.playground_room_members where room_id=p_room_id and status <> 'left';
  select count(*) into v_spectator_count from public.playground_spectator_sessions where room_id=p_room_id and status='watching';
  return jsonb_build_object('room_id',p_room.id,'game_key',p_room.game_key,'status',p_room.status,'turn_no',p_room.turn_no,'state',public.playground_public_state(p_room,null,false),'player_count',v_member_count,'spectator_count',v_spectator_count);
end;
$$;

revoke all on function public.playground_public_state(public.playground_rooms,uuid,boolean) from public;
revoke all on function public.set_playground_spectator_mode(uuid,boolean) from public;
revoke all on function public.join_playground_spectator(uuid) from public;
revoke all on function public.leave_playground_spectator(uuid) from public;
revoke all on function public.playground_spectator_snapshot(uuid) from public;
grant execute on function public.set_playground_spectator_mode(uuid,boolean) to authenticated;
grant execute on function public.join_playground_spectator(uuid) to authenticated;
grant execute on function public.leave_playground_spectator(uuid) to authenticated;
grant execute on function public.playground_spectator_snapshot(uuid) to authenticated;

comment on table public.playground_spectator_sessions is 'Opt-in, age-scoped spectator sessions. Direct access is denied and snapshots contain no learner identity or hidden game information.';
