-- DataKwest MVP feature: daily mission completion.
-- Completion is server-authoritative so XP and streaks cannot be fabricated by clients.

DROP POLICY IF EXISTS "Users can update own mission state" ON public.missions;

CREATE OR REPLACE FUNCTION public.complete_daily_mission(p_mission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_mission public.missions;
  v_xp integer := 25;
  v_streak public.streaks;
  v_new_streak integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT * INTO v_mission
  FROM public.missions
  WHERE id = p_mission_id
    AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'mission_not_found' USING errcode = 'P0002';
  END IF;

  IF v_mission.status = 'completed' THEN
    SELECT * INTO v_streak FROM public.streaks WHERE user_id = v_user_id;
    RETURN jsonb_build_object(
      'mission_id', v_mission.id,
      'status', v_mission.status,
      'xp_awarded', 0,
      'streak', coalesce(v_streak.current_count, 0),
      'already_completed', true
    );
  END IF;

  UPDATE public.missions
  SET status = 'completed', completed_at = now()
  WHERE id = v_mission.id;

  INSERT INTO public.xp_events (user_id, event_type, amount, source_id, metadata)
  VALUES (v_user_id, 'daily_mission_completed', v_xp, v_mission.id, jsonb_build_object('mission_type', v_mission.mission_type));

  INSERT INTO public.streaks (user_id, current_count, longest_count, last_active_date)
  VALUES (v_user_id, 1, 1, current_date)
  ON CONFLICT (user_id) DO UPDATE
  SET current_count = CASE
        WHEN public.streaks.last_active_date = current_date THEN public.streaks.current_count
        WHEN public.streaks.last_active_date = current_date - 1 THEN public.streaks.current_count + 1
        ELSE 1
      END,
      longest_count = GREATEST(
        public.streaks.longest_count,
        CASE
          WHEN public.streaks.last_active_date = current_date THEN public.streaks.current_count
          WHEN public.streaks.last_active_date = current_date - 1 THEN public.streaks.current_count + 1
          ELSE 1
        END
      ),
      last_active_date = current_date,
      updated_at = now()
  RETURNING * INTO v_streak;

  v_new_streak := v_streak.current_count;

  RETURN jsonb_build_object(
    'mission_id', v_mission.id,
    'status', 'completed',
    'xp_awarded', v_xp,
    'streak', v_new_streak,
    'already_completed', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.complete_daily_mission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_daily_mission(uuid) TO authenticated;
