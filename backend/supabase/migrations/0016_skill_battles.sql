-- DataKwest Phase 3: Skill Battles.
-- Battle eligibility, session binding, score aggregation, and leaderboard ranking stay server-authoritative.

ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS challenge_id uuid REFERENCES public.challenges(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS practice_sessions_challenge_user_idx
  ON public.practice_sessions (challenge_id, user_id, started_at DESC);

CREATE OR REPLACE FUNCTION public.get_skill_battle_lobby(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_battles jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid_limit' USING errcode = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'title', c.title,
    'description', c.description,
    'starts_at', c.starts_at,
    'ends_at', c.ends_at,
    'rules', c.rules,
    'status', c.status,
    'participation_status', cp.status,
    'participant_count', (SELECT count(*) FROM public.challenge_participants x WHERE x.challenge_id = c.id AND x.status <> 'withdrawn')
  ) ORDER BY coalesce(c.starts_at, c.created_at)), '[]'::jsonb)
  INTO v_battles
  FROM (
    SELECT * FROM public.challenges
    WHERE challenge_type = 'battle'
      AND status IN ('active', 'scheduled')
      AND (ends_at IS NULL OR ends_at >= now())
    ORDER BY coalesce(starts_at, created_at)
    LIMIT p_limit
  ) c
  LEFT JOIN public.challenge_participants cp
    ON cp.challenge_id = c.id AND cp.user_id = v_user_id;

  RETURN jsonb_build_object('battles', v_battles, 'generated_at', now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.start_skill_battle(
  p_challenge_id uuid,
  p_skill_id uuid DEFAULT NULL,
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
  v_challenge public.challenges;
  v_session jsonb;
  v_session_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
    AND challenge_type = 'battle'
    AND status = 'active'
    AND (ends_at IS NULL OR ends_at >= now())
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'battle_unavailable' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.challenge_participants
    WHERE challenge_id = p_challenge_id AND user_id = v_user_id AND status = 'enrolled'
  ) THEN
    RAISE EXCEPTION 'battle_enrollment_required' USING errcode = '42501';
  END IF;

  SELECT public.start_practice_session(p_skill_id, 'timed', p_item_limit, p_difficulty) INTO v_session;
  v_session_id := (v_session ->> 'session_id')::uuid;
  UPDATE public.practice_sessions SET challenge_id = p_challenge_id WHERE id = v_session_id AND user_id = v_user_id;

  RETURN v_session || jsonb_build_object('challenge_id', p_challenge_id, 'battle_status', 'active');
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_skill_battle_leaderboard(
  p_challenge_id uuid,
  p_limit integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_leaderboard jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid_limit' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.challenges
    WHERE id = p_challenge_id AND challenge_type = 'battle'
      AND status IN ('active', 'scheduled', 'closed')
  ) THEN
    RAISE EXCEPTION 'battle_unavailable' USING errcode = '22023';
  END IF;

  WITH scores AS (
    SELECT ps.user_id,
           coalesce(sum(a.score), 0)::numeric(10,2) AS score,
           count(a.id)::integer AS answered,
           count(*) FILTER (WHERE (a.feedback ->> 'correct')::boolean IS TRUE)::integer AS correct,
           coalesce(sum(a.duration_seconds), 0)::integer AS duration_seconds
    FROM public.practice_sessions ps
    LEFT JOIN public.practice_session_items psi ON psi.session_id = ps.id
    LEFT JOIN public.attempts a ON a.id = psi.attempt_id
    WHERE ps.challenge_id = p_challenge_id
    GROUP BY ps.user_id
  ), ranked AS (
    SELECT row_number() OVER (ORDER BY score DESC, correct DESC, duration_seconds ASC, user_id) AS rank,
           user_id,
           score,
           answered,
           correct,
           duration_seconds
    FROM scores
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'rank', rank,
    'score', score,
    'answered', answered,
    'correct', correct,
    'duration_seconds', duration_seconds,
    'is_current_user', user_id = v_user_id
  ) ORDER BY rank), '[]'::jsonb)
  INTO v_leaderboard
  FROM (SELECT * FROM ranked WHERE rank <= p_limit OR user_id = v_user_id) ranked_limited;

  RETURN jsonb_build_object('challenge_id', p_challenge_id, 'leaderboard', v_leaderboard);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_skill_battle_lobby(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_skill_battle_lobby(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.start_skill_battle(uuid, uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_skill_battle(uuid, uuid, integer, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_skill_battle_leaderboard(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_skill_battle_leaderboard(uuid, integer) TO authenticated;
