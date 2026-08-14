-- Datakwest Phase 2: trusted evaluator worker bridge
-- The Edge Function authenticates the learner, evaluates submitted evidence, and calls this RPC with the service role.

CREATE OR REPLACE FUNCTION public.evaluate_interview_session_system(
  p_session_id uuid,
  p_locale text,
  p_total_score numeric,
  p_rubric_scores jsonb,
  p_feedback jsonb,
  p_strengths jsonb DEFAULT '[]'::jsonb,
  p_improvements jsonb DEFAULT '[]'::jsonb,
  p_evidence_fresh_until timestamptz DEFAULT NULL,
  p_evaluation_version integer DEFAULT 1
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_session public.interview_sessions;
  v_evaluation public.interview_evaluations;
  v_fresh_until timestamptz := coalesce(p_evidence_fresh_until, now() + interval '180 days');
BEGIN
  IF coalesce(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'system_evaluation_only' USING errcode = '42501';
  END IF;
  IF p_total_score < 0 OR p_total_score > 100 OR p_evaluation_version < 1 THEN RAISE EXCEPTION 'invalid_interview_evaluation' USING errcode = '22023'; END IF;
  SELECT * INTO v_session FROM public.interview_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'interview_session_not_found' USING errcode = '22023'; END IF;
  IF v_session.status NOT IN ('submitted', 'evaluating', 'completed') THEN RAISE EXCEPTION 'interview_session_not_submitted' USING errcode = '22023'; END IF;

  INSERT INTO public.interview_evaluations (session_id, evaluator_id, evaluator_type, evaluation_version, locale, total_score, rubric_scores, feedback, strengths, improvements, evidence_fresh_until)
  VALUES (p_session_id, NULL, 'automated', p_evaluation_version, coalesce(nullif(p_locale, ''), v_session.locale, 'en'), p_total_score, coalesce(p_rubric_scores, '{}'::jsonb), coalesce(p_feedback, '{}'::jsonb), coalesce(p_strengths, '[]'::jsonb), coalesce(p_improvements, '[]'::jsonb), v_fresh_until)
  ON CONFLICT (session_id) DO UPDATE SET
    evaluator_id = NULL, evaluator_type = 'automated', evaluation_version = EXCLUDED.evaluation_version, locale = EXCLUDED.locale, total_score = EXCLUDED.total_score, rubric_scores = EXCLUDED.rubric_scores, feedback = EXCLUDED.feedback, strengths = EXCLUDED.strengths, improvements = EXCLUDED.improvements, evidence_fresh_until = EXCLUDED.evidence_fresh_until, created_at = now()
  RETURNING * INTO v_evaluation;

  UPDATE public.interview_sessions SET status = 'completed', total_score = p_total_score, score_breakdown = coalesce(p_rubric_scores, '{}'::jsonb), feedback = coalesce(p_feedback, '{}'::jsonb), evaluation_version = p_evaluation_version, evidence_fresh_until = v_fresh_until, evaluated_at = now(), completed_at = coalesce(completed_at, now()), updated_at = now() WHERE id = p_session_id;

  INSERT INTO public.domain_events (event_type, schema_version, subject_type, subject_id, payload)
  VALUES ('interview_evaluation_completed', 1, 'interview_session', p_session_id, jsonb_build_object('evaluation_id', v_evaluation.id, 'locale', v_evaluation.locale, 'evaluation_version', p_evaluation_version, 'total_score', p_total_score));

  RETURN jsonb_build_object('session_id', p_session_id, 'evaluation_id', v_evaluation.id, 'status', 'completed', 'total_score', p_total_score, 'evidence_fresh_until', v_fresh_until, 'evaluation_version', p_evaluation_version, 'locale', v_evaluation.locale);
END;
$function$;

REVOKE ALL ON FUNCTION public.evaluate_interview_session_system(uuid, text, numeric, jsonb, jsonb, jsonb, jsonb, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.evaluate_interview_session_system(uuid, text, numeric, jsonb, jsonb, jsonb, jsonb, timestamptz, integer) TO service_role;
