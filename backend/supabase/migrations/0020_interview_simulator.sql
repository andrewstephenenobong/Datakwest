-- Datakwest Phase 2: Interview Simulator foundation
-- Server-authoritative sessions and response capture. Evaluation scores remain nullable
-- until a versioned evaluator records evidence-backed rubric results.

CREATE TABLE IF NOT EXISTS public.interview_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  career_path_id uuid REFERENCES public.career_paths(id) ON DELETE SET NULL,
  interview_type text NOT NULL CHECK (interview_type IN ('technical', 'behavioural', 'hr', 'coding', 'portfolio')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  prompts jsonb NOT NULL DEFAULT '[]'::jsonb,
  rubric jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'pilot', 'published', 'deprecated')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interview_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.interview_templates(id) ON DELETE RESTRICT,
  career_path_id uuid REFERENCES public.career_paths(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'submitted', 'evaluating', 'completed', 'abandoned')),
  rubric_version integer NOT NULL DEFAULT 1 CHECK (rubric_version > 0),
  prompt_count integer NOT NULL DEFAULT 0 CHECK (prompt_count >= 0),
  answered_count integer NOT NULL DEFAULT 0 CHECK (answered_count >= 0),
  total_score numeric(5,2),
  score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.interview_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt_index integer NOT NULL CHECK (prompt_index >= 0),
  prompt_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  evaluation_status text NOT NULL DEFAULT 'pending' CHECK (evaluation_status IN ('pending', 'evaluating', 'evaluated', 'flagged')),
  score numeric(5,2),
  rubric_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, prompt_index)
);

ALTER TABLE public.interview_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_responses ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.interview_templates FROM anon, authenticated;
REVOKE ALL ON TABLE public.interview_sessions FROM anon, authenticated;
REVOKE ALL ON TABLE public.interview_responses FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_interview_workspace(p_interview_type text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_templates jsonb;
  v_history jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', t.id,
    'career_path_id', t.career_path_id,
    'interview_type', t.interview_type,
    'title', t.title,
    'description', t.description,
    'prompts', t.prompts,
    'rubric_version', t.version
  ) ORDER BY t.updated_at DESC), '[]'::jsonb)
  INTO v_templates
  FROM public.interview_templates t
  WHERE t.status = 'published'
    AND (p_interview_type IS NULL OR t.interview_type = p_interview_type);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'session_id', s.id,
    'template_id', s.template_id,
    'interview_type', t.interview_type,
    'title', t.title,
    'status', s.status,
    'answered_count', s.answered_count,
    'prompt_count', s.prompt_count,
    'total_score', s.total_score,
    'feedback', s.feedback,
    'started_at', s.started_at,
    'completed_at', s.completed_at
  ) ORDER BY s.started_at DESC), '[]'::jsonb)
  INTO v_history
  FROM public.interview_sessions s
  JOIN public.interview_templates t ON t.id = s.template_id
  WHERE s.user_id = v_user_id;

  RETURN jsonb_build_object('templates', v_templates, 'history', v_history);
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_interview_session(p_template_id uuid)
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
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT * INTO v_template
  FROM public.interview_templates
  WHERE id = p_template_id AND status = 'published';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'interview_template_unavailable' USING errcode = '22023';
  END IF;

  v_prompt_count := CASE WHEN jsonb_typeof(v_template.prompts) = 'array' THEN jsonb_array_length(v_template.prompts) ELSE 0 END;

  INSERT INTO public.interview_sessions (user_id, template_id, career_path_id, rubric_version, prompt_count)
  VALUES (v_user_id, v_template.id, v_template.career_path_id, v_template.version, v_prompt_count)
  RETURNING * INTO v_session;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'template_id', v_template.id,
    'interview_type', v_template.interview_type,
    'title', v_template.title,
    'prompts', v_template.prompts,
    'rubric_version', v_template.version,
    'status', v_session.status,
    'started_at', v_session.started_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_interview_response(
  p_session_id uuid,
  p_prompt_index integer,
  p_response jsonb,
  p_duration_seconds integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.interview_sessions;
  v_template public.interview_templates;
  v_prompt jsonb;
  v_response public.interview_responses;
  v_prompt_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_prompt_index < 0 OR p_response IS NULL THEN
    RAISE EXCEPTION 'invalid_interview_response' USING errcode = '22023';
  END IF;

  SELECT * INTO v_session
  FROM public.interview_sessions
  WHERE id = p_session_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'interview_session_not_found' USING errcode = '22023';
  END IF;
  IF v_session.status NOT IN ('started', 'submitted') THEN
    RAISE EXCEPTION 'interview_session_not_active' USING errcode = '22023';
  END IF;

  SELECT * INTO v_template FROM public.interview_templates WHERE id = v_session.template_id;
  v_prompt_count := CASE WHEN jsonb_typeof(v_template.prompts) = 'array' THEN jsonb_array_length(v_template.prompts) ELSE 0 END;
  IF p_prompt_index >= v_prompt_count THEN
    RAISE EXCEPTION 'interview_prompt_unavailable' USING errcode = '22023';
  END IF;
  v_prompt := v_template.prompts -> p_prompt_index;

  INSERT INTO public.interview_responses (session_id, user_id, prompt_index, prompt_snapshot, response, duration_seconds)
  VALUES (v_session.id, v_user_id, p_prompt_index, v_prompt, p_response, p_duration_seconds)
  ON CONFLICT (session_id, prompt_index) DO UPDATE
    SET response = EXCLUDED.response,
        duration_seconds = EXCLUDED.duration_seconds,
        updated_at = now()
  RETURNING * INTO v_response;

  UPDATE public.interview_sessions
  SET answered_count = (SELECT count(*) FROM public.interview_responses WHERE session_id = v_session.id),
      status = 'started',
      updated_at = now()
  WHERE id = v_session.id;

  RETURN jsonb_build_object(
    'response_id', v_response.id,
    'session_id', v_session.id,
    'prompt_index', v_response.prompt_index,
    'evaluation_status', v_response.evaluation_status,
    'answered_count', (SELECT answered_count FROM public.interview_sessions WHERE id = v_session.id),
    'prompt_count', v_prompt_count
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_interview_session(p_session_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.interview_sessions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  UPDATE public.interview_sessions
  SET status = 'submitted', submitted_at = now(), updated_at = now()
  WHERE id = p_session_id
    AND user_id = v_user_id
    AND status IN ('started', 'submitted')
  RETURNING * INTO v_session;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'interview_session_not_found_or_closed' USING errcode = '22023';
  END IF;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'status', v_session.status,
    'answered_count', v_session.answered_count,
    'prompt_count', v_session.prompt_count,
    'evaluation_status', 'pending'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_interview_workspace(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_interview_workspace(text) TO authenticated;
REVOKE ALL ON FUNCTION public.start_interview_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_interview_session(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_interview_response(uuid, integer, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_interview_response(uuid, integer, jsonb, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_interview_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_interview_session(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS interview_templates_published_type_idx
  ON public.interview_templates (status, interview_type, updated_at DESC);
CREATE INDEX IF NOT EXISTS interview_sessions_user_started_idx
  ON public.interview_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS interview_responses_session_prompt_idx
  ON public.interview_responses (session_id, prompt_index);

COMMENT ON TABLE public.interview_templates IS 'Versioned, reviewable interview content; only published templates are learner-visible.';
COMMENT ON TABLE public.interview_sessions IS 'Learner-owned interview attempts; scores remain server-generated and nullable until evaluated.';
COMMENT ON TABLE public.interview_responses IS 'Learner-owned response evidence with immutable prompt snapshots and pending evaluation state.';
COMMENT ON COLUMN public.interview_sessions.total_score IS 'Server-authoritative score populated only by a future versioned evaluator.';
COMMENT ON COLUMN public.interview_responses.score IS 'Server-authoritative rubric score populated only by an evaluator, never by the learner client.';
COMMENT ON COLUMN public.interview_responses.prompt_snapshot IS 'Versioned prompt evidence retained for reproducible review.';

REVOKE ALL ON FUNCTION public.get_interview_workspace(text) FROM anon;
REVOKE ALL ON FUNCTION public.start_interview_session(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.submit_interview_response(uuid, integer, jsonb, integer) FROM anon;
REVOKE ALL ON FUNCTION public.submit_interview_session(uuid) FROM anon;
