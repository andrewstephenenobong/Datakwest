create or replace function public.heartbeat_playground_whot(p_room_id uuid)
returns jsonb language plpgsql security definer set search_path = public, pg_catalog as $fn$
declare v_user uuid:=auth.uid();
begin
  if v_user is null then raise exception 'not_authenticated' using errcode='42501'; end if;
  update public.playground_room_members set status='joined',last_seen_at=now() where room_id=p_room_id and user_id=v_user and status in('joined','disconnected');
  if not found then raise exception 'not_room_member' using errcode='42501'; end if;
  update public.playground_room_members set status='disconnected' where room_id=p_room_id and user_id<>v_user and status='joined' and last_seen_at<now()-interval '45 seconds';
  return public.playground_whot_snapshot(p_room_id);
end;
$fn$;
revoke all on function public.heartbeat_playground_whot(uuid) from public;
grant execute on function public.heartbeat_playground_whot(uuid) to authenticated;
comment on function public.heartbeat_playground_whot(uuid) is 'Reconnect-safe Whot presence heartbeat returning only the requesting player hand and public match state.';
