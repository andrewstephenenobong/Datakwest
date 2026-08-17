-- Allow authenticated learners to read their own daily missions.
-- RLS remains the row-level boundary; completion stays server-authoritative through
-- complete_daily_mission and no client update privilege is restored.

GRANT SELECT ON TABLE public.missions TO authenticated;

COMMENT ON TABLE public.missions IS
  'Daily learner missions. Authenticated SELECT is restricted by the own-user RLS policy; state changes use complete_daily_mission.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'missions'
      AND policyname = 'Users can view own missions'
  ) THEN
    CREATE POLICY "Users can view own missions"
      ON public.missions
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END
$$;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.missions FROM authenticated;

REVOKE ALL ON FUNCTION public.complete_daily_mission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_daily_mission(uuid) TO authenticated;
