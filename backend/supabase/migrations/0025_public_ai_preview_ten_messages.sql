-- Public AI preview: ten server-enforced messages per visitor per day.
ALTER TABLE public.public_ai_preview_usage
  DROP CONSTRAINT IF EXISTS public_ai_preview_usage_call_count_check;

ALTER TABLE public.public_ai_preview_usage
  ADD CONSTRAINT public_ai_preview_usage_call_count_check CHECK (call_count >= 0 AND call_count <= 10);

CREATE OR REPLACE FUNCTION public.consume_public_ai_preview(p_visitor_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_row public.public_ai_preview_usage;
  v_remaining integer;
  v_limit constant integer := 10;
BEGIN
  IF p_visitor_token IS NULL OR length(p_visitor_token) < 16 OR length(p_visitor_token) > 128 THEN
    RAISE EXCEPTION 'preview_token_invalid' USING errcode = '22023';
  END IF;

  INSERT INTO public.public_ai_preview_usage (visitor_token, usage_date, call_count)
  VALUES (p_visitor_token, current_date, 1)
  ON CONFLICT (visitor_token) DO UPDATE SET
    usage_date = CASE WHEN public.public_ai_preview_usage.usage_date <> current_date THEN current_date ELSE public.public_ai_preview_usage.usage_date END,
    call_count = CASE WHEN public.public_ai_preview_usage.usage_date <> current_date THEN 1 ELSE public.public_ai_preview_usage.call_count + 1 END,
    updated_at = now()
  RETURNING * INTO v_row;

  IF v_row.call_count > v_limit THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', v_limit);
  END IF;

  v_remaining := greatest(0, v_limit - v_row.call_count);
  RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining, 'limit', v_limit);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_public_ai_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_public_ai_preview(text) TO service_role;
