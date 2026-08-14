-- DataKwest MVP feature: server-authoritative readiness scoring.
-- The client cannot submit a score; the database derives it from learner evidence.

CREATE OR REPLACE FUNCTION public.get_readiness_score()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_attempt_score numeric := 0;
  v_mission_score numeric := 0;
  v_project_score numeric := 0;
  v_attempt_count integer := 0;
  v_completed_missions integer := 0;
  v_mission_count integer := 0;
  v_reviewed_projects integer := 0;
  v_score numeric := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT coalesce(avg(score), 0), count(*)::integer
  INTO v_attempt_score, v_attempt_count
  FROM public.attempts
  WHERE user_id = v_user_id
    AND score IS NOT NULL;

  SELECT count(*) FILTER (WHERE status = 'completed')::integer, count(*)::integer
  INTO v_completed_missions, v_mission_count
  FROM public.missions
  WHERE user_id = v_user_id
    AND mission_date >= current_date - 13;

  SELECT count(*)::integer
  INTO v_reviewed_projects
  FROM public.submissions
  WHERE user_id = v_user_id
    AND status IN ('reviewed', 'published');

  v_mission_score := CASE
    WHEN v_mission_count = 0 THEN 0
    ELSE (v_completed_missions::numeric / v_mission_count::numeric) * 100
  END;

  v_project_score := CASE
    WHEN v_reviewed_projects = 0 THEN 0
    ELSE least(100, v_reviewed_projects::numeric * 25)
  END;

  v_score := round(least(100, greatest(0,
    (v_attempt_score * 0.5) +
    (v_mission_score * 0.3) +
    (v_project_score * 0.2)
  )), 2);

  RETURN jsonb_build_object(
    'score', v_score,
    'band', CASE
      WHEN v_score >= 80 THEN 'ready'
      WHEN v_score >= 55 THEN 'building'
      ELSE 'starting'
    END,
    'factors', jsonb_build_object(
      'practice_average', round(v_attempt_score, 2),
      'mission_completion', round(v_mission_score, 2),
      'reviewed_projects', round(v_project_score, 2)
    ),
    'evidence', jsonb_build_object(
      'attempts', v_attempt_count,
      'completed_missions', v_completed_missions,
      'missions_considered', v_mission_count,
      'reviewed_projects', v_reviewed_projects
    ),
    'rubric_version', 1,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_readiness_score() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_readiness_score() TO authenticated;

CREATE INDEX IF NOT EXISTS missions_user_date_status_idx
  ON public.missions (user_id, mission_date, status);

CREATE INDEX IF NOT EXISTS attempts_user_score_idx
  ON public.attempts (user_id, score)
  WHERE score IS NOT NULL;

CREATE INDEX IF NOT EXISTS submissions_user_status_idx
  ON public.submissions (user_id, status);
