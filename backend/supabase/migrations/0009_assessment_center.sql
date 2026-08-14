-- DataKwest MVP feature: authenticated assessment center.
-- Assessment authoring and scoring remain server-controlled; learners can only inspect their own attempts.

CREATE OR REPLACE FUNCTION public.get_assessment_center()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_history jsonb;
  v_available jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'attempt_id', a.id,
    'assessment_id', a.assessment_id,
    'title', coalesce(ass.title, 'Assessment'),
    'score', a.score,
    'feedback', a.feedback,
    'created_at', a.created_at
  ) ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO v_history
  FROM public.attempts a
  LEFT JOIN public.assessments ass ON ass.id = a.assessment_id
  WHERE a.user_id = v_user_id
    AND a.assessment_id IS NOT NULL;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', ass.id,
    'title', ass.title,
    'skill_id', ass.skill_id,
    'career_path_id', ass.career_path_id,
    'version', ass.version
  ) ORDER BY ass.created_at DESC), '[]'::jsonb)
  INTO v_available
  FROM public.assessments ass
  WHERE ass.status = 'published';

  RETURN jsonb_build_object(
    'history', v_history,
    'available', v_available
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_assessment_center() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_assessment_center() TO authenticated;

CREATE INDEX IF NOT EXISTS attempts_user_assessment_created_idx
  ON public.attempts (user_id, assessment_id, created_at desc)
  WHERE assessment_id IS NOT NULL;
