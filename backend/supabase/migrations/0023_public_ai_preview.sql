-- Datakwest public AI preview: anonymous, non-mutating, server-limited usage.
CREATE TABLE IF NOT EXISTS public.public_ai_preview_usage (
  visitor_token text PRIMARY KEY CHECK (length(visitor_token) BETWEEN 16 AND 128),
  usage_date date NOT NULL DEFAULT current_date,
  call_count integer NOT NULL DEFAULT 0 CHECK (call_count >= 0 AND call_count <= 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.public_ai_preview_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.public_ai_preview_usage FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_public_ai_preview(p_visitor_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_row public.public_ai_preview_usage;
  v_remaining integer;
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
  IF v_row.call_count > 3 THEN
    RETURN jsonb_build_object('allowed', false, 'remaining', 0, 'limit', 3);
  END IF;
  v_remaining := greatest(0, 3 - v_row.call_count);
  RETURN jsonb_build_object('allowed', true, 'remaining', v_remaining, 'limit', 3);
END;
$function$;

REVOKE ALL ON FUNCTION public.consume_public_ai_preview(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_public_ai_preview(text) TO service_role;
