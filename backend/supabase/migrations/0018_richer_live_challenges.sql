-- DataKwest Phase 3: richer live challenges.
-- Challenge prompts and answer keys remain server-side; learner progress and scores are RPC-controlled.

CREATE TABLE IF NOT EXISTS public.challenge_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL,
  prompt jsonb NOT NULL DEFAULT '{}'::jsonb,
  answer_key jsonb NOT NULL DEFAULT '{}'::jsonb,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  UNIQUE (challenge_id, position)
);

CREATE TABLE IF NOT EXISTS public.challenge_round_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.challenge_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (round_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.challenge_checkpoint_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.challenge_round_sessions(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES public.challenge_rounds(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  feedback jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'scored' CHECK (status IN ('scored', 'disputed', 'voided')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

CREATE TABLE IF NOT EXISTS public.challenge_score_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.challenge_checkpoint_submissions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (char_length(trim(reason)) BETWEEN 10 AND 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, user_id)
);

ALTER TABLE public.challenge_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_round_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_checkpoint_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_score_disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own live challenge sessions"
  ON public.challenge_round_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can view own live challenge submissions"
  ON public.challenge_checkpoint_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can view own live challenge disputes"
  ON public.challenge_score_disputes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS challenge_rounds_live_window_idx
  ON public.challenge_rounds (challenge_id, status, starts_at, ends_at, position);
CREATE INDEX IF NOT EXISTS challenge_round_sessions_user_round_idx
  ON public.challenge_round_sessions (user_id, round_id, started_at DESC);
CREATE INDEX IF NOT EXISTS challenge_submissions_challenge_user_idx
  ON public.challenge_checkpoint_submissions (round_id, user_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS challenge_score_disputes_status_idx
  ON public.challenge_score_disputes (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.get_live_challenge_workspace(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_challenge public.challenges;
  v_rounds jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id AND status IN ('scheduled', 'active', 'closed')
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge_unavailable' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = p_challenge_id AND user_id = v_user_id AND status = 'enrolled'
  ) THEN
    RAISE EXCEPTION 'challenge_enrollment_required' USING errcode = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'position', r.position,
    'title', r.title,
    'prompt', CASE WHEN r.status = 'live' AND now() BETWEEN r.starts_at AND r.ends_at THEN r.prompt ELSE NULL END,
    'rules', r.rules,
    'starts_at', r.starts_at,
    'ends_at', r.ends_at,
    'status', CASE WHEN now() < r.starts_at THEN 'scheduled' WHEN now() > r.ends_at THEN 'closed' ELSE 'live' END,
    'session_id', s.id,
    'session_started_at', s.started_at,
    'submission_status', sub.status,
    'score', sub.score
  ) ORDER BY r.position), '[]'::jsonb)
  INTO v_rounds
  FROM public.challenge_rounds r
  LEFT JOIN public.challenge_round_sessions s
    ON s.round_id = r.id AND s.user_id = v_user_id
  LEFT JOIN public.challenge_checkpoint_submissions sub
    ON sub.session_id = s.id
  WHERE r.challenge_id = p_challenge_id;

  RETURN jsonb_build_object(
    'challenge', jsonb_build_object('id', v_challenge.id, 'title', v_challenge.title, 'description', v_challenge.description, 'rules', v_challenge.rules, 'starts_at', v_challenge.starts_at, 'ends_at', v_challenge.ends_at, 'status', v_challenge.status),
    'rounds', v_rounds
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_live_challenge_round(p_round_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_round public.challenge_rounds;
  v_session public.challenge_round_sessions;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  SELECT r.* INTO v_round
  FROM public.challenge_rounds r
  JOIN public.challenges c ON c.id = r.challenge_id
  WHERE r.id = p_round_id
    AND c.status = 'active'
    AND r.status = 'live'
    AND now() BETWEEN r.starts_at AND r.ends_at
    AND EXISTS (SELECT 1 FROM public.challenge_participants cp WHERE cp.challenge_id = r.challenge_id AND cp.user_id = v_user_id AND cp.status = 'enrolled')
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'live_round_unavailable' USING errcode = '22023';
  END IF;

  SELECT * INTO v_session FROM public.challenge_round_sessions WHERE round_id = p_round_id AND user_id = v_user_id FOR UPDATE;
  IF FOUND AND v_session.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'round_already_completed' USING errcode = '22023';
  END IF;
  IF NOT FOUND THEN
    INSERT INTO public.challenge_round_sessions (round_id, user_id) VALUES (p_round_id, v_user_id) RETURNING * INTO v_session;
  END IF;

  RETURN jsonb_build_object('session_id', v_session.id, 'round_id', v_round.id, 'title', v_round.title, 'prompt', v_round.prompt, 'rules', v_round.rules, 'starts_at', v_round.starts_at, 'ends_at', v_round.ends_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_live_challenge_round(p_session_id uuid, p_response jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_session public.challenge_round_sessions;
  v_round public.challenge_rounds;
  v_submission public.challenge_checkpoint_submissions;
  v_correct boolean;
  v_score numeric(5,2);
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_response IS NULL THEN
    RAISE EXCEPTION 'invalid_response' USING errcode = '22023';
  END IF;
  SELECT s.* INTO v_session
  FROM public.challenge_round_sessions s
  WHERE s.id = p_session_id AND s.user_id = v_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'round_session_unavailable' USING errcode = '22023';
  END IF;
  SELECT r.* INTO v_round
  FROM public.challenge_rounds r
  WHERE r.id = v_session.round_id
  FOR SHARE;
  IF NOT FOUND OR v_session.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'round_session_unavailable' USING errcode = '22023';
  END IF;
  IF now() > v_round.ends_at THEN
    RAISE EXCEPTION 'round_closed' USING errcode = '22023';
  END IF;

  IF jsonb_typeof(v_round.answer_key) = 'object' AND v_round.answer_key ? 'answer' THEN
    v_correct := v_round.answer_key -> 'answer' = p_response;
  ELSE
    v_correct := v_round.answer_key = p_response;
  END IF;
  v_score := CASE WHEN v_correct THEN 100 ELSE 0 END;

  INSERT INTO public.challenge_checkpoint_submissions (session_id, round_id, user_id, response, score, feedback)
  VALUES (v_session.id, v_round.id, v_user_id, p_response, v_score, jsonb_build_object('correct', v_correct))
  RETURNING * INTO v_submission;
  UPDATE public.challenge_round_sessions SET completed_at = now() WHERE id = v_session.id;

  RETURN jsonb_build_object('submission_id', v_submission.id, 'round_id', v_round.id, 'score', v_submission.score, 'feedback', v_submission.feedback, 'submitted_at', v_submission.submitted_at);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_live_challenge_leaderboard(p_challenge_id uuid, p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_rows jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid_limit' USING errcode = '22023';
  END IF;
  WITH scores AS (
    SELECT s.user_id, sum(sub.score)::numeric(10,2) AS score, count(sub.id)::integer AS rounds_completed, min(s.started_at) AS first_started_at
    FROM public.challenge_round_sessions s
    JOIN public.challenge_rounds r ON r.id = s.round_id
    JOIN public.challenge_checkpoint_submissions sub ON sub.session_id = s.id AND sub.status <> 'voided'
    WHERE r.challenge_id = p_challenge_id
    GROUP BY s.user_id
  ), ranked AS (
    SELECT row_number() OVER (ORDER BY score DESC, rounds_completed DESC, first_started_at ASC, user_id) AS rank, *
    FROM scores
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object('rank', rank, 'score', score, 'rounds_completed', rounds_completed, 'is_current_user', user_id = v_user_id) ORDER BY rank), '[]'::jsonb)
  INTO v_rows
  FROM (SELECT * FROM ranked WHERE rank <= p_limit OR user_id = v_user_id) visible;
  RETURN jsonb_build_object('challenge_id', p_challenge_id, 'leaderboard', v_rows);
END;
$function$;

CREATE OR REPLACE FUNCTION public.report_live_challenge_score(p_submission_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_dispute public.challenge_score_disputes;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  INSERT INTO public.challenge_score_disputes (submission_id, user_id, reason)
  SELECT p_submission_id, v_user_id, trim(p_reason)
  WHERE EXISTS (SELECT 1 FROM public.challenge_checkpoint_submissions s WHERE s.id = p_submission_id AND s.user_id = v_user_id)
  ON CONFLICT (submission_id, user_id) DO UPDATE SET reason = EXCLUDED.reason, status = 'open', updated_at = now()
  RETURNING * INTO v_dispute;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission_unavailable' USING errcode = '22023';
  END IF;
  UPDATE public.challenge_checkpoint_submissions SET status = 'disputed' WHERE id = p_submission_id AND user_id = v_user_id;
  RETURN jsonb_build_object('dispute_id', v_dispute.id, 'submission_id', v_dispute.submission_id, 'status', v_dispute.status);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_live_challenge_workspace(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_challenge_workspace(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.start_live_challenge_round(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_live_challenge_round(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_live_challenge_round(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_live_challenge_round(uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.get_live_challenge_leaderboard(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_challenge_leaderboard(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.report_live_challenge_score(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_live_challenge_score(uuid, text) TO authenticated;
