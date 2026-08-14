-- DataKwest MVP feature: challenge participation.
-- Enrollment is server-authoritative so clients cannot fabricate completion or rewards.

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'enrolled' check (status in ('enrolled', 'completed', 'withdrawn')),
  joined_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (challenge_id, user_id)
);

ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenge participation"
  ON public.challenge_participants
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

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
    'status', c.status,
    'participation_status', cp.status
  ) ORDER BY coalesce(c.starts_at, c.created_at)), '[]'::jsonb)
  INTO v_challenges
  FROM public.challenges c
  LEFT JOIN public.challenge_participants cp
    ON cp.challenge_id = c.id
   AND cp.user_id = v_user_id
  WHERE c.status IN ('active', 'scheduled')
    AND (c.ends_at IS NULL OR c.ends_at >= now());

  RETURN jsonb_build_object(
    'challenges', v_challenges,
    'generated_at', now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_challenge(p_challenge_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_challenge public.challenges;
  v_participant public.challenge_participants;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT * INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id
    AND status IN ('active', 'scheduled')
    AND (ends_at IS NULL OR ends_at >= now())
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge_unavailable' USING errcode = '22023';
  END IF;

  INSERT INTO public.challenge_participants (challenge_id, user_id)
  VALUES (p_challenge_id, v_user_id)
  ON CONFLICT (challenge_id, user_id) DO UPDATE
    SET status = CASE
      WHEN public.challenge_participants.status = 'withdrawn' THEN 'enrolled'
      ELSE public.challenge_participants.status
    END
  RETURNING * INTO v_participant;

  RETURN jsonb_build_object(
    'challenge_id', v_participant.challenge_id,
    'participation_status', v_participant.status,
    'joined_at', v_participant.joined_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_challenge_center() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_challenge_center() TO authenticated;
REVOKE ALL ON FUNCTION public.join_challenge(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_challenge(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS challenge_participants_user_status_idx
  ON public.challenge_participants (user_id, status, joined_at desc);
