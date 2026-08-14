-- DataKwest MVP feature: project evidence submission.
-- Learners submit evidence through a server-authoritative RPC; clients cannot set review states.

DROP POLICY IF EXISTS "Users can insert own submissions" ON public.submissions;
DROP POLICY IF EXISTS "Users can update own draft submissions" ON public.submissions;

CREATE OR REPLACE FUNCTION public.submit_project_evidence(
  p_project_id uuid,
  p_evidence jsonb,
  p_reflection text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_submission public.submissions;
  v_submission_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
      AND status = 'published'
  ) THEN
    RAISE EXCEPTION 'project_not_available' USING errcode = 'P0002';
  END IF;

  SELECT * INTO v_submission
  FROM public.submissions
  WHERE project_id = p_project_id
    AND user_id = v_user_id
    AND status IN ('draft', 'submitted', 'in_review')
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND AND v_submission.status = 'in_review' THEN
    RAISE EXCEPTION 'submission_locked' USING errcode = '55000';
  END IF;

  IF FOUND THEN
    UPDATE public.submissions
    SET evidence = coalesce(p_evidence, '{}'::jsonb),
        reflection = coalesce(p_reflection, ''),
        status = 'submitted',
        submitted_at = now(),
        updated_at = now()
    WHERE id = v_submission.id
    RETURNING id INTO v_submission_id;
  ELSE
    INSERT INTO public.submissions (
      project_id, user_id, evidence, reflection, visibility, status, submitted_at
    )
    VALUES (
      p_project_id, v_user_id, coalesce(p_evidence, '{}'::jsonb), coalesce(p_reflection, ''),
      'private', 'submitted', now()
    )
    RETURNING id INTO v_submission_id;
  END IF;

  RETURN jsonb_build_object(
    'submission_id', v_submission_id,
    'status', 'submitted',
    'submitted_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_project_evidence(uuid, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_project_evidence(uuid, jsonb, text) TO authenticated;

CREATE INDEX IF NOT EXISTS submissions_project_user_status_idx
  ON public.submissions (project_id, user_id, status, created_at desc);
