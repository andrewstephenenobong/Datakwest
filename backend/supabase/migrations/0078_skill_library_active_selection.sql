-- Guided multi-skill learning library.
-- The learner can record their starting level and choose one active skill for the day.

ALTER TABLE public.learner_skill_enrolments
  ADD COLUMN IF NOT EXISTS starting_level text NOT NULL DEFAULT 'beginner'
  CHECK (starting_level IN ('beginner', 'familiar', 'intermediate', 'advanced'));

ALTER TABLE public.learner_preferences
  ADD COLUMN IF NOT EXISTS active_skill_enrolment_id uuid
  REFERENCES public.learner_skill_enrolments(id) ON DELETE SET NULL;

GRANT SELECT ON TABLE public.learner_skill_enrolments TO authenticated;
GRANT SELECT ON TABLE public.learner_preferences TO authenticated;

CREATE OR REPLACE FUNCTION public.create_skill_enrolment(
  p_skill_id uuid,
  p_skill_graph_version_id uuid DEFAULT NULL,
  p_locale text DEFAULT 'en',
  p_weekly_minutes integer DEFAULT NULL,
  p_target_outcome text DEFAULT '',
  p_starting_level text DEFAULT 'beginner'
)
RETURNS public.learner_skill_enrolments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_version_id uuid;
  v_row public.learner_skill_enrolments;
  v_level text := lower(trim(coalesce(p_starting_level, 'beginner')));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '28000';
  END IF;
  IF v_level NOT IN ('beginner', 'familiar', 'intermediate', 'advanced') THEN
    RAISE EXCEPTION 'invalid_starting_level' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.skills s WHERE s.id = p_skill_id AND s.status <> 'archived') THEN
    RAISE EXCEPTION 'skill_not_available' USING errcode = '22023';
  END IF;

  IF p_skill_graph_version_id IS NOT NULL THEN
    SELECT v.id INTO v_version_id
    FROM public.skill_graph_versions v
    WHERE v.id = p_skill_graph_version_id
      AND v.skill_id = p_skill_id
      AND v.locale = coalesce(nullif(p_locale, ''), 'en')
      AND v.status = 'published';
  ELSE
    SELECT v.id INTO v_version_id
    FROM public.skill_graph_versions v
    WHERE v.skill_id = p_skill_id
      AND v.locale = coalesce(nullif(p_locale, ''), 'en')
      AND v.status = 'published'
    ORDER BY v.version_no DESC
    LIMIT 1;
  END IF;
  IF v_version_id IS NULL THEN
    RAISE EXCEPTION 'published_skill_graph_not_found' USING errcode = '22023';
  END IF;

  INSERT INTO public.learner_skill_enrolments (
    learner_id, skill_id, skill_graph_version_id, status, source,
    target_outcome, weekly_minutes, locale, age_band, starting_level
  ) VALUES (
    v_user_id, p_skill_id, v_version_id, 'active', 'learner_selected',
    coalesce(p_target_outcome, ''), p_weekly_minutes, coalesce(nullif(p_locale, ''), 'en'),
    coalesce((SELECT age_band FROM public.learner_preferences WHERE learner_id = v_user_id), '13_plus'), v_level
  )
  ON CONFLICT (learner_id, skill_id) WHERE status = 'active'
  DO UPDATE SET
    skill_graph_version_id = excluded.skill_graph_version_id,
    target_outcome = excluded.target_outcome,
    weekly_minutes = excluded.weekly_minutes,
    locale = excluded.locale,
    starting_level = excluded.starting_level,
    updated_at = now()
  RETURNING * INTO v_row;

  INSERT INTO public.learner_preferences (learner_id, active_skill_enrolment_id, updated_at)
  VALUES (v_user_id, v_row.id, now())
  ON CONFLICT (learner_id) DO UPDATE
  SET active_skill_enrolment_id = excluded.active_skill_enrolment_id, updated_at = now();

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_active_skill_enrolment(p_enrolment_id uuid)
RETURNS public.learner_skill_enrolments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_row public.learner_skill_enrolments;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '28000';
  END IF;
  SELECT * INTO v_row
  FROM public.learner_skill_enrolments
  WHERE id = p_enrolment_id AND learner_id = v_user_id AND status = 'active';
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'skill_enrolment_not_found' USING errcode = '22023';
  END IF;
  INSERT INTO public.learner_preferences (learner_id, active_skill_enrolment_id, updated_at)
  VALUES (v_user_id, p_enrolment_id, now())
  ON CONFLICT (learner_id) DO UPDATE
  SET active_skill_enrolment_id = excluded.active_skill_enrolment_id, updated_at = now();
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_skill_enrolment(uuid, uuid, text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_skill_enrolment(uuid, uuid, text, integer, text, text) TO authenticated;
REVOKE ALL ON FUNCTION public.set_active_skill_enrolment(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_active_skill_enrolment(uuid) TO authenticated;
