-- DataKwest MVP feature: server-authoritative Practice Engine.
-- Correct answers remain private in public.practice_items.answer and are never returned to clients.

ALTER TABLE public.attempts
  ADD COLUMN IF NOT EXISTS practice_item_id uuid REFERENCES public.practice_items(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.practice_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id uuid REFERENCES public.skills(id) ON DELETE SET NULL,
  mode text NOT NULL DEFAULT 'adaptive' CHECK (mode IN ('spaced', 'adaptive', 'timed', 'mock_exam', 'weak_topic')),
  target_difficulty integer CHECK (target_difficulty IS NULL OR target_difficulty BETWEEN 1 AND 5),
  item_limit integer NOT NULL DEFAULT 5 CHECK (item_limit BETWEEN 1 AND 20),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.practice_session_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.practice_sessions(id) ON DELETE CASCADE,
  practice_item_id uuid NOT NULL REFERENCES public.practice_items(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  served_at timestamptz NOT NULL DEFAULT now(),
  attempt_id uuid REFERENCES public.attempts(id) ON DELETE SET NULL,
  UNIQUE (session_id, practice_item_id),
  UNIQUE (session_id, position)
);

ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_session_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own practice sessions"
  ON public.practice_sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own practice session items"
  ON public.practice_session_items
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.practice_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION public.start_practice_session(
  p_skill_id uuid DEFAULT NULL,
  p_mode text DEFAULT 'adaptive',
  p_item_limit integer DEFAULT 5,
  p_difficulty integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.practice_sessions;
  v_items jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_mode NOT IN ('spaced', 'adaptive', 'timed', 'mock_exam', 'weak_topic') THEN
    RAISE EXCEPTION 'invalid_practice_mode' USING errcode = '22023';
  END IF;
  IF p_item_limit < 1 OR p_item_limit > 20 THEN
    RAISE EXCEPTION 'invalid_item_limit' USING errcode = '22023';
  END IF;
  IF p_difficulty IS NOT NULL AND (p_difficulty < 1 OR p_difficulty > 5) THEN
    RAISE EXCEPTION 'invalid_difficulty' USING errcode = '22023';
  END IF;

  INSERT INTO public.practice_sessions (user_id, skill_id, mode, target_difficulty, item_limit)
  VALUES (v_user_id, p_skill_id, p_mode, p_difficulty, p_item_limit)
  RETURNING * INTO v_session;

  WITH candidates AS (
    SELECT pi.id, pi.skill_id, pi.prompt, pi.difficulty, pi.metadata,
           COALESCE(AVG(a.score) FILTER (WHERE a.user_id = v_user_id), 50) AS prior_score,
           ROW_NUMBER() OVER (
             ORDER BY
               CASE WHEN p_mode = 'weak_topic' THEN COALESCE(AVG(a.score) FILTER (WHERE a.user_id = v_user_id), 0) ELSE 0 END ASC,
               CASE WHEN p_difficulty IS NULL THEN 0 ELSE abs(pi.difficulty - p_difficulty) END ASC,
               random()
           ) AS position
    FROM public.practice_items pi
    LEFT JOIN public.attempts a ON a.practice_item_id = pi.id
    WHERE (p_skill_id IS NULL OR pi.skill_id = p_skill_id)
      AND (p_difficulty IS NULL OR pi.difficulty = p_difficulty)
    GROUP BY pi.id
  ), selected AS (
    SELECT * FROM candidates WHERE position <= p_item_limit
  )
  INSERT INTO public.practice_session_items (session_id, practice_item_id, position)
  SELECT v_session.id, id, position FROM selected;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', psi.practice_item_id,
    'position', psi.position,
    'prompt', pi.prompt,
    'difficulty', pi.difficulty,
    'metadata', pi.metadata
  ) ORDER BY psi.position), '[]'::jsonb)
  INTO v_items
  FROM public.practice_session_items psi
  JOIN public.practice_items pi ON pi.id = psi.practice_item_id
  WHERE psi.session_id = v_session.id;

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'mode', v_session.mode,
    'item_limit', v_session.item_limit,
    'items', v_items
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_practice_answer(
  p_session_id uuid,
  p_practice_item_id uuid,
  p_answer jsonb,
  p_duration_seconds integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.practice_sessions;
  v_item public.practice_items;
  v_session_item public.practice_session_items;
  v_attempt public.attempts;
  v_score numeric(5,2);
  v_correct boolean := false;
  v_expected jsonb;
  v_received jsonb;
  v_completed_count integer;
  v_total_count integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_duration_seconds IS NOT NULL AND p_duration_seconds < 0 THEN
    RAISE EXCEPTION 'invalid_duration' USING errcode = '22023';
  END IF;

  SELECT * INTO v_session
  FROM public.practice_sessions
  WHERE id = p_session_id AND user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND OR v_session.status <> 'active' THEN
    RAISE EXCEPTION 'practice_session_unavailable' USING errcode = '22023';
  END IF;

  SELECT * INTO v_session_item
  FROM public.practice_session_items
  WHERE session_id = p_session_id AND practice_item_id = p_practice_item_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'practice_item_not_in_session' USING errcode = '22023';
  END IF;
  IF v_session_item.attempt_id IS NOT NULL THEN
    RAISE EXCEPTION 'practice_item_already_answered' USING errcode = '22023';
  END IF;

  SELECT * INTO v_item FROM public.practice_items WHERE id = p_practice_item_id;
  v_expected := v_item.answer;
  v_received := coalesce(p_answer, '{}'::jsonb);

  IF jsonb_typeof(v_expected) = 'array' AND jsonb_typeof(v_received) = 'array' THEN
    SELECT jsonb_agg(value ORDER BY value::text) INTO v_expected FROM jsonb_array_elements(v_expected);
    SELECT jsonb_agg(value ORDER BY value::text) INTO v_received FROM jsonb_array_elements(v_received);
    v_correct := v_expected = v_received;
  ELSIF jsonb_typeof(v_expected) IN ('string', 'number', 'boolean')
    AND jsonb_typeof(v_received) IN ('string', 'number', 'boolean') THEN
    v_correct := lower(trim(v_expected #>> '{}')) = lower(trim(v_received #>> '{}'));
  ELSE
    v_correct := v_expected = v_received;
  END IF;

  v_score := CASE WHEN v_correct THEN 100 ELSE 0 END;

  INSERT INTO public.attempts (user_id, practice_item_id, answer, score, feedback, duration_seconds)
  VALUES (
    v_user_id,
    p_practice_item_id,
    v_received,
    v_score,
    jsonb_build_object('correct', v_correct, 'mode', v_session.mode),
    p_duration_seconds
  )
  RETURNING * INTO v_attempt;

  UPDATE public.practice_session_items
  SET attempt_id = v_attempt.id
  WHERE id = v_session_item.id;

  SELECT count(*) FILTER (WHERE attempt_id IS NOT NULL), count(*)
  INTO v_completed_count, v_total_count
  FROM public.practice_session_items
  WHERE session_id = p_session_id;

  IF v_completed_count = v_total_count THEN
    UPDATE public.practice_sessions
    SET status = 'completed', completed_at = now()
    WHERE id = p_session_id;
  END IF;

  RETURN jsonb_build_object(
    'attempt_id', v_attempt.id,
    'score', v_score,
    'correct', v_correct,
    'completed_items', v_completed_count,
    'total_items', v_total_count,
    'session_status', CASE WHEN v_completed_count = v_total_count THEN 'completed' ELSE 'active' END,
    'feedback', v_attempt.feedback
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_practice_history(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_history jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid_limit' USING errcode = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'attempt_id', a.id,
    'practice_item_id', a.practice_item_id,
    'score', a.score,
    'feedback', a.feedback,
    'duration_seconds', a.duration_seconds,
    'created_at', a.created_at
  ) ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO v_history
  FROM (
    SELECT * FROM public.attempts
    WHERE user_id = v_user_id AND practice_item_id IS NOT NULL
    ORDER BY created_at DESC
    LIMIT p_limit
  ) a;

  RETURN jsonb_build_object('history', v_history);
END;
$function$;

REVOKE ALL ON FUNCTION public.start_practice_session(uuid, text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_practice_session(uuid, text, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_practice_answer(uuid, uuid, jsonb, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_practice_answer(uuid, uuid, jsonb, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_practice_history(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_practice_history(integer) TO authenticated;

CREATE INDEX IF NOT EXISTS practice_items_skill_difficulty_idx
  ON public.practice_items (skill_id, difficulty);
CREATE INDEX IF NOT EXISTS attempts_user_practice_created_idx
  ON public.attempts (user_id, practice_item_id, created_at DESC)
  WHERE practice_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS practice_session_items_session_position_idx
  ON public.practice_session_items (session_id, position);
