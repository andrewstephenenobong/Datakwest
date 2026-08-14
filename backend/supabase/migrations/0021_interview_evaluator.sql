-- Datakwest Phase 2: versioned Interview Evaluator
-- Evaluations are trusted-server/admin operations. Learner clients can only submit evidence.

ALTER TABLE public.interview_templates
  ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS supported_locales jsonb NOT NULL DEFAULT '["en"]'::jsonb;

ALTER TABLE public.interview_sessions
  ADD COLUMN IF NOT EXISTS locale text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS evidence_fresh_until timestamptz,
  ADD COLUMN IF NOT EXISTS evaluation_version integer,
  ADD COLUMN IF NOT EXISTS evaluated_at timestamptz;

CREATE TABLE IF NOT EXISTS public.interview_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  evaluator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evaluator_type text NOT NULL DEFAULT 'reviewer' CHECK (evaluator_type IN ('automated', 'reviewer', 'admin')),
  evaluation_version integer NOT NULL CHECK (evaluation_version > 0),
  locale text NOT NULL DEFAULT 'en',
  total_score numeric(5,2) NOT NULL CHECK (total_score BETWEEN 0 AND 100),
  rubric_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  improvements jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence_fresh_until timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_evaluations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.interview_evaluations FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission text, p_organisation_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.admin_assignments aa
    JOIN public.admin_role_permissions rp ON rp.role = aa.role
    WHERE aa.user_id = v_user_id
      AND aa.status = 'active'
      AND (aa.expires_at IS NULL OR aa.expires_at > now())
      AND rp.permission = p_permission
      AND (p_organisation_id IS NULL OR aa.organisation_id IS NULL OR aa.organisation_id = p_organisation_id)
  );
END;
$function$;

INSERT INTO public.admin_role_permissions (role, permission) VALUES
  ('senior_trust_reviewer', 'interview:evaluate'),
  ('platform_operator', 'interview:evaluate')
ON CONFLICT (role, permission) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_interview_evaluation(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.interview_sessions;
  v_evaluation public.interview_evaluations;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id AND user_id = v_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'interview_session_not_found' USING errcode = '22023'; END IF;
  SELECT * INTO v_evaluation FROM public.interview_evaluations WHERE session_id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'pending', 'session_id', p_session_id);
  END IF;
  RETURN jsonb_build_object(
    'status', 'completed',
    'session_id', p_session_id,
    'evaluation_id', v_evaluation.id,
    'locale', v_evaluation.locale,
    'evaluation_version', v_evaluation.evaluation_version,
    'total_score', v_evaluation.total_score,
    'rubric_scores', v_evaluation.rubric_scores,
    'feedback', v_evaluation.feedback,
    'strengths', v_evaluation.strengths,
    'improvements', v_evaluation.improvements,
    'evidence_fresh_until', v_evaluation.evidence_fresh_until,
    'evaluated_at', v_evaluation.created_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.evaluate_interview_session(
  p_session_id uuid,
  p_locale text,
  p_total_score numeric,
  p_rubric_scores jsonb,
  p_feedback jsonb,
  p_strengths jsonb DEFAULT '[]'::jsonb,
  p_improvements jsonb DEFAULT '[]'::jsonb,
  p_evidence_fresh_until timestamptz DEFAULT NULL,
  p_evaluation_version integer DEFAULT 1,
  p_evaluator_type text DEFAULT 'automated'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.interview_sessions;
  v_evaluation public.interview_evaluations;
  v_fresh_until timestamptz := coalesce(p_evidence_fresh_until, now() + interval '180 days');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF NOT public.has_admin_permission('interview:evaluate') THEN RAISE EXCEPTION 'interview_evaluation_permission_required' USING errcode = '42501'; END IF;
  IF p_total_score < 0 OR p_total_score > 100 OR p_evaluation_version < 1 THEN RAISE EXCEPTION 'invalid_interview_evaluation' USING errcode = '22023'; END IF;
  IF p_evaluator_type NOT IN ('automated', 'reviewer', 'admin') THEN RAISE EXCEPTION 'invalid_evaluator_type' USING errcode = '22023'; END IF;

  SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'interview_session_not_found' USING errcode = '22023'; END IF;
  IF v_session.status NOT IN ('submitted', 'evaluating', 'completed') THEN RAISE EXCEPTION 'interview_session_not_submitted' USING errcode = '22023'; END IF;

  INSERT INTO public.interview_evaluations (session_id, evaluator_id, evaluator_type, evaluation_version, locale, total_score, rubric_scores, feedback, strengths, improvements, evidence_fresh_until)
  VALUES (p_session_id, v_user_id, p_evaluator_type, p_evaluation_version, coalesce(nullif(p_locale, ''), v_session.locale, 'en'), p_total_score, coalesce(p_rubric_scores, '{}'::jsonb), coalesce(p_feedback, '{}'::jsonb), coalesce(p_strengths, '[]'::jsonb), coalesce(p_improvements, '[]'::jsonb), v_fresh_until)
  ON CONFLICT (session_id) DO UPDATE SET
    evaluator_id = EXCLUDED.evaluator_id,
    evaluator_type = EXCLUDED.evaluator_type,
    evaluation_version = EXCLUDED.evaluation_version,
    locale = EXCLUDED.locale,
    total_score = EXCLUDED.total_score,
    rubric_scores = EXCLUDED.rubric_scores,
    feedback = EXCLUDED.feedback,
    strengths = EXCLUDED.strengths,
    improvements = EXCLUDED.improvements,
    evidence_fresh_until = EXCLUDED.evidence_fresh_until,
    created_at = now()
  RETURNING * INTO v_evaluation;

  UPDATE public.interview_sessions
  SET status = 'completed', total_score = p_total_score, score_breakdown = coalesce(p_rubric_scores, '{}'::jsonb), feedback = coalesce(p_feedback, '{}'::jsonb), evaluation_version = p_evaluation_version, evidence_fresh_until = v_fresh_until, evaluated_at = now(), completed_at = coalesce(completed_at, now()), updated_at = now()
  WHERE id = p_session_id;

  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, reason, before_state, after_state)
  VALUES (v_user_id, 'interview_evaluation_recorded', 'interview_session', p_session_id, 'Versioned interview evaluation recorded', '{}'::jsonb, jsonb_build_object('evaluation_id', v_evaluation.id, 'locale', v_evaluation.locale, 'evaluation_version', p_evaluation_version, 'evaluator_type', p_evaluator_type));

  RETURN jsonb_build_object('session_id', p_session_id, 'evaluation_id', v_evaluation.id, 'status', 'completed', 'total_score', p_total_score, 'evidence_fresh_until', v_fresh_until, 'evaluation_version', p_evaluation_version, 'locale', v_evaluation.locale);
END;
$function$;

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
  v_interview_score numeric := 0;
  v_attempt_count integer := 0;
  v_completed_missions integer := 0;
  v_mission_count integer := 0;
  v_reviewed_projects integer := 0;
  v_interview_count integer := 0;
  v_score numeric := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  SELECT coalesce(avg(score), 0), count(*)::integer INTO v_attempt_score, v_attempt_count FROM public.attempts WHERE user_id = v_user_id AND score IS NOT NULL;
  SELECT count(*) FILTER (WHERE status = 'completed')::integer, count(*)::integer INTO v_completed_missions, v_mission_count FROM public.missions WHERE user_id = v_user_id AND mission_date >= current_date - 13;
  SELECT count(*)::integer INTO v_reviewed_projects FROM public.submissions WHERE user_id = v_user_id AND status IN ('reviewed', 'published');
  SELECT coalesce(avg(total_score), 0), count(*)::integer INTO v_interview_score, v_interview_count FROM public.interview_sessions WHERE user_id = v_user_id AND status = 'completed' AND total_score IS NOT NULL AND (evidence_fresh_until IS NULL OR evidence_fresh_until >= now());
  v_mission_score := CASE WHEN v_mission_count = 0 THEN 0 ELSE (v_completed_missions::numeric / v_mission_count::numeric) * 100 END;
  v_project_score := CASE WHEN v_reviewed_projects = 0 THEN 0 ELSE least(100, v_reviewed_projects::numeric * 25) END;
  v_score := round(least(100, greatest(0, (v_attempt_score * 0.4) + (v_mission_score * 0.25) + (v_project_score * 0.2) + (v_interview_score * 0.15))), 2);
  RETURN jsonb_build_object(
    'score', v_score,
    'band', CASE WHEN v_score >= 80 THEN 'ready' WHEN v_score >= 55 THEN 'building' ELSE 'starting' END,
    'factors', jsonb_build_object('practice_average', round(v_attempt_score, 2), 'mission_completion', round(v_mission_score, 2), 'reviewed_projects', round(v_project_score, 2), 'interview_average', round(v_interview_score, 2)),
    'evidence', jsonb_build_object('attempts', v_attempt_count, 'completed_missions', v_completed_missions, 'missions_considered', v_mission_count, 'reviewed_projects', v_reviewed_projects, 'completed_interviews', v_interview_count),
    'rubric_version', 2,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_interview_evaluation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_interview_evaluation(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.evaluate_interview_session(uuid, text, numeric, jsonb, jsonb, jsonb, jsonb, timestamptz, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_interview_session(uuid, text, numeric, jsonb, jsonb, jsonb, jsonb, timestamptz, integer, text) TO authenticated;
REVOKE ALL ON FUNCTION public.get_readiness_score() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_readiness_score() TO authenticated;

CREATE INDEX IF NOT EXISTS interview_sessions_fresh_evidence_idx ON public.interview_sessions (user_id, status, evidence_fresh_until) WHERE status = 'completed';
CREATE INDEX IF NOT EXISTS interview_evaluations_locale_version_idx ON public.interview_evaluations (locale, evaluation_version, created_at DESC);

CREATE OR REPLACE FUNCTION public.start_interview_session(p_template_id uuid, p_locale text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_template public.interview_templates;
  v_session public.interview_sessions;
  v_prompt_count integer;
  v_locale text := coalesce(nullif(p_locale, ''), 'en');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  SELECT * INTO v_template FROM public.interview_templates WHERE id = p_template_id AND status = 'published';
  IF NOT FOUND THEN RAISE EXCEPTION 'interview_template_unavailable' USING errcode = '22023'; END IF;
  IF jsonb_typeof(v_template.supported_locales) = 'array' AND NOT (v_template.supported_locales ? v_locale) THEN
    RAISE EXCEPTION 'interview_locale_unavailable' USING errcode = '22023';
  END IF;
  v_prompt_count := CASE WHEN jsonb_typeof(v_template.prompts) = 'array' THEN jsonb_array_length(v_template.prompts) ELSE 0 END;
  INSERT INTO public.interview_sessions (user_id, template_id, career_path_id, rubric_version, prompt_count, locale)
  VALUES (v_user_id, v_template.id, v_template.career_path_id, v_template.version, v_prompt_count, v_locale)
  RETURNING * INTO v_session;
  RETURN jsonb_build_object('session_id', v_session.id, 'template_id', v_template.id, 'interview_type', v_template.interview_type, 'title', v_template.title, 'prompts', v_template.prompts, 'rubric_version', v_template.version, 'locale', v_session.locale, 'status', v_session.status, 'started_at', v_session.started_at);
END;
$function$;

REVOKE ALL ON FUNCTION public.start_interview_session(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_interview_session(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.start_interview_session(uuid, text) FROM anon;
