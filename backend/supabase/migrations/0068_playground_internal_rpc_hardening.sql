-- 0068_playground_internal_rpc_hardening.sql
-- Internal state constructors are called by protected RPCs and are not client APIs.

revoke execute on function public.playground_initial_state(text, uuid, uuid) from authenticated;
revoke execute on function public.playground_connect_four_winner(jsonb, integer, integer, text) from authenticated;
revoke execute on function public.playground_public_state(public.playground_rooms, uuid, boolean) from authenticated;
revoke execute on function public.settle_playground_match_result() from authenticated;

comment on function public.playground_initial_state(text, uuid, uuid) is 'Internal constructor. Learners must not execute this helper directly; protected room RPCs call it server-side.';
