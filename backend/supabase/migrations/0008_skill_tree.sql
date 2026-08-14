-- DataKwest MVP feature: published learner skill tree.
-- Curriculum authoring remains server/admin-only; learners receive a read-only published graph.

CREATE OR REPLACE FUNCTION public.get_learner_skill_tree(p_career_path_slug text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_tree jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(path_row ORDER BY path_row->>'title'), '[]'::jsonb)
  INTO v_tree
  FROM (
    SELECT jsonb_build_object(
      'slug', cp.slug,
      'title', cp.title,
      'description', cp.description,
      'skills', coalesce((
        SELECT jsonb_agg(skill_row ORDER BY skill_row->>'title')
        FROM (
          SELECT jsonb_build_object(
            'slug', s.slug,
            'title', s.title,
            'description', s.description,
            'nodes', coalesce((
              SELECT jsonb_agg(jsonb_build_object(
                'slug', cn.slug,
                'title', cn.title,
                'node_type', cn.node_type,
                'available', exists (
                  SELECT 1 FROM public.content_lessons cl
                  WHERE cl.concept_node_id = cn.id AND cl.status = 'published'
                )
              ) ORDER BY cn.created_at)
              FROM public.concept_nodes cn
              WHERE cn.skill_id = s.id
            ), '[]'::jsonb)
          ) AS skill_row
          FROM public.skills s
          WHERE s.career_path_id = cp.id
        ) skill_rows
      ), '[]'::jsonb)
    ) AS path_row
    FROM public.career_paths cp
    WHERE cp.status = 'published'
      AND (p_career_path_slug IS NULL OR cp.slug = p_career_path_slug)
  ) path_rows;

  RETURN jsonb_build_object('career_paths', v_tree, 'generated_at', now());
END;
$function$;

REVOKE ALL ON FUNCTION public.get_learner_skill_tree(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_learner_skill_tree(text) TO authenticated;

CREATE INDEX IF NOT EXISTS content_lessons_concept_published_idx
  ON public.content_lessons (concept_node_id, status)
  WHERE status = 'published';
