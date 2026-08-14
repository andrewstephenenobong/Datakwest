-- DataKwest MVP feature: learner challenge center.
-- Challenge publishing remains server/admin-controlled; learners receive read-only published state.

CREATE OR REPLACE FUNCTION public.get_challenge_center()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_challenges jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'description', c.description,
    'challenge_type', c.challenge_type,
    'starts_at', c.starts_at,
    'ends_at', c.ends_at,
    'rules', c.rules,
    'status', c.status
  ) ORDER BY coalesce(c.starts_at, c.created_at)), '[]'::jsonb)
  INTO v_challenges
  FROM public.challenges c
  WHERE c.status IN ('active', 'scheduled')
    AND (c.ends_at IS NULL OR c.ends_at >= now());

  RETURN jsonb_build_object(
    'challenges', v_challenges,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_challenge_center() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_challenge_center() TO authenticated;

CREATE INDEX IF NOT EXISTS challenges_status_schedule_idx
  ON public.challenges (status, starts_at, ends_at);
