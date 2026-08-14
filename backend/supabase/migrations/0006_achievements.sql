-- DataKwest MVP feature: evidence-backed achievements.
-- Badge awards are derived and written by a trusted function; clients cannot self-award badges.

INSERT INTO public.badges (slug, title, description, criteria)
VALUES
  ('first-mission', 'First Mission', 'Complete your first daily mission.', '{"type":"mission_count","value":1}'::jsonb),
  ('three-day-streak', 'Three-Day Streak', 'Keep learning for three active days.', '{"type":"streak","value":3}'::jsonb),
  ('first-project', 'Evidence Builder', 'Submit your first project for review.', '{"type":"submission_count","value":1}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_learner_achievements()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_xp integer := 0;
  v_mission_count integer := 0;
  v_submission_count integer := 0;
  v_current_streak integer := 0;
  v_longest_streak integer := 0;
  v_badges jsonb := '[]'::jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT coalesce(sum(amount), 0)::integer INTO v_xp
  FROM public.xp_events WHERE user_id = v_user_id;

  SELECT count(*)::integer INTO v_mission_count
  FROM public.missions WHERE user_id = v_user_id AND status = 'completed';

  SELECT count(*)::integer INTO v_submission_count
  FROM public.submissions WHERE user_id = v_user_id AND status IN ('submitted', 'in_review', 'reviewed', 'published');

  SELECT coalesce(current_count, 0), coalesce(longest_count, 0)
  INTO v_current_streak, v_longest_streak
  FROM public.streaks WHERE user_id = v_user_id;

  INSERT INTO public.user_badges (user_id, badge_id, evidence)
  SELECT v_user_id, b.id, jsonb_build_object('mission_count', v_mission_count)
  FROM public.badges b
  WHERE b.slug = 'first-mission' AND v_mission_count >= 1
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_id, evidence)
  SELECT v_user_id, b.id, jsonb_build_object('longest_streak', v_longest_streak)
  FROM public.badges b
  WHERE b.slug = 'three-day-streak' AND greatest(v_current_streak, v_longest_streak) >= 3
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  INSERT INTO public.user_badges (user_id, badge_id, evidence)
  SELECT v_user_id, b.id, jsonb_build_object('submission_count', v_submission_count)
  FROM public.badges b
  WHERE b.slug = 'first-project' AND v_submission_count >= 1
  ON CONFLICT (user_id, badge_id) DO NOTHING;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'slug', b.slug,
    'title', b.title,
    'description', b.description,
    'awarded_at', ub.awarded_at,
    'evidence', ub.evidence
  ) ORDER BY ub.awarded_at DESC), '[]'::jsonb)
  INTO v_badges
  FROM public.user_badges ub
  JOIN public.badges b ON b.id = ub.badge_id
  WHERE ub.user_id = v_user_id;

  RETURN jsonb_build_object(
    'xp', v_xp,
    'missions_completed', v_mission_count,
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'badges', v_badges
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_learner_achievements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learner_achievements() TO authenticated;

CREATE INDEX IF NOT EXISTS user_badges_user_awarded_idx
  ON public.user_badges (user_id, awarded_at desc);
