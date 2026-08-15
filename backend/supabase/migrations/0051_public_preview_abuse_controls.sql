-- Public AI preview abuse controls.
-- The raw edge identity is never stored. The database stores a daily-rotating SHA-256 key.

alter table public.public_ai_preview_usage
  drop constraint if exists public_ai_preview_usage_call_count_check;

alter table public.public_ai_preview_usage
  add constraint public_ai_preview_usage_call_count_check check (call_count >= 0 and call_count <= 50);

alter table public.public_ai_preview_usage
  add column if not exists abuse_key text;

create index if not exists public_ai_preview_usage_abuse_day_idx
  on public.public_ai_preview_usage(abuse_key, usage_date);

create or replace function public.consume_public_ai_preview(
  p_visitor_token text,
  p_abuse_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $function$
declare
  v_token_row public.public_ai_preview_usage;
  v_abuse_row public.public_ai_preview_usage;
  v_remaining integer;
  v_abuse_remaining integer;
  v_limit constant integer := 10;
  v_abuse_limit constant integer := 50;
  v_daily_key text;
begin
  if p_visitor_token is null or length(p_visitor_token) < 16 or length(p_visitor_token) > 128 then
    raise exception 'preview_token_invalid' using errcode = '22023';
  end if;

  v_daily_key := case
    when nullif(trim(coalesce(p_abuse_key, '')), '') is null then null
    else encode(extensions.digest(trim(p_abuse_key) || ':' || current_date::text, 'sha256'), 'hex')
  end;

  insert into public.public_ai_preview_usage (visitor_token, usage_date, call_count, abuse_key)
  values (p_visitor_token, current_date, 1, v_daily_key)
  on conflict (visitor_token) do update set
    usage_date = case when public.public_ai_preview_usage.usage_date <> current_date then current_date else public.public_ai_preview_usage.usage_date end,
    call_count = case when public.public_ai_preview_usage.usage_date <> current_date then 1 else public.public_ai_preview_usage.call_count + 1 end,
    abuse_key = coalesce(v_daily_key, public.public_ai_preview_usage.abuse_key),
    updated_at = now()
  returning * into v_token_row;

  if v_daily_key is not null then
    insert into public.public_ai_preview_usage (visitor_token, usage_date, call_count, abuse_key)
    values ('abuse:' || v_daily_key, current_date, 1, v_daily_key)
    on conflict (visitor_token) do update set
      usage_date = case when public.public_ai_preview_usage.usage_date <> current_date then current_date else public.public_ai_preview_usage.usage_date end,
      call_count = case when public.public_ai_preview_usage.usage_date <> current_date then 1 else public.public_ai_preview_usage.call_count + 1 end,
      updated_at = now()
    returning * into v_abuse_row;

    if v_abuse_row.call_count > v_abuse_limit then
      return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'reason', 'abuse_limit');
    end if;
    v_abuse_remaining := greatest(0, v_abuse_limit - v_abuse_row.call_count);
  else
    v_abuse_remaining := null;
  end if;

  if v_token_row.call_count > v_limit then
    return jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit, 'abuse_remaining', v_abuse_remaining);
  end if;

  v_remaining := greatest(0, v_limit - v_token_row.call_count);
  return jsonb_build_object('allowed', true, 'remaining', v_remaining, 'limit', v_limit, 'abuse_remaining', v_abuse_remaining);
end;
$function$;

revoke all on function public.consume_public_ai_preview(text) from public, anon, authenticated;
revoke all on function public.consume_public_ai_preview(text, text) from public, anon, authenticated;
grant execute on function public.consume_public_ai_preview(text, text) to service_role;
