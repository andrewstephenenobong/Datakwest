-- 0059_playground_deny_policies.sql
-- The Playground exposes no direct table access. All authenticated writes and reads
-- must pass through the narrowly scoped RPC surface in 0058.

create policy playground_rooms_deny_direct_access
  on public.playground_rooms for all to authenticated
  using (false) with check (false);

create policy playground_room_members_deny_direct_access
  on public.playground_room_members for all to authenticated
  using (false) with check (false);

create policy playground_matchmaking_queue_deny_direct_access
  on public.playground_matchmaking_queue for all to authenticated
  using (false) with check (false);

create policy playground_game_intents_deny_direct_access
  on public.playground_game_intents for all to authenticated
  using (false) with check (false);

create policy playground_reactions_deny_direct_access
  on public.playground_reactions for all to authenticated
  using (false) with check (false);

comment on policy playground_rooms_deny_direct_access on public.playground_rooms is 'Direct client access is denied; use protected Playground RPCs.';
comment on policy playground_room_members_deny_direct_access on public.playground_room_members is 'Direct client access is denied; use protected Playground RPCs.';
comment on policy playground_matchmaking_queue_deny_direct_access on public.playground_matchmaking_queue is 'Direct client access is denied; use protected Playground RPCs.';
comment on policy playground_game_intents_deny_direct_access on public.playground_game_intents is 'Direct client access is denied; use protected Playground RPCs.';
comment on policy playground_reactions_deny_direct_access on public.playground_reactions is 'Direct client access is denied; use protected Playground RPCs.';
