-- DataKwest Phase 3: Marketplace learner opportunity flow.
-- Employer authoring and pipeline administration remain privileged; learners use RPC-only discovery and applications.

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own applications"
  ON public.applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_marketplace(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_opportunities jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid_limit' USING errcode = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'organisation_id', o.organisation_id,
    'organisation_name', org.name,
    'title', o.title,
    'description', o.description,
    'opportunity_type', o.opportunity_type,
    'requirements', o.requirements,
    'status', o.status,
    'application_status', a.status,
    'created_at', o.created_at
  ) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_opportunities
  FROM (
    SELECT * FROM public.opportunities
    WHERE status = 'published'
    ORDER BY created_at DESC
    LIMIT p_limit
  ) o
  LEFT JOIN public.organisations org ON org.id = o.organisation_id
  LEFT JOIN public.applications a
    ON a.opportunity_id = o.id AND a.user_id = v_user_id;

  RETURN jsonb_build_object('opportunities', v_opportunities, 'generated_at', now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_my_applications(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_applications jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid_limit' USING errcode = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'opportunity_id', a.opportunity_id,
    'title', o.title,
    'organisation_name', org.name,
    'opportunity_type', o.opportunity_type,
    'status', a.status,
    'evidence', a.evidence,
    'created_at', a.created_at,
    'updated_at', a.updated_at
  ) ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO v_applications
  FROM (
    SELECT * FROM public.applications
    WHERE user_id = v_user_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) a
  JOIN public.opportunities o ON o.id = a.opportunity_id
  LEFT JOIN public.organisations org ON org.id = o.organisation_id;

  RETURN jsonb_build_object('applications', v_applications);
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_to_opportunity(
  p_opportunity_id uuid,
  p_evidence jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_opportunity public.opportunities;
  v_application public.applications;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence) <> 'object' THEN
    RAISE EXCEPTION 'invalid_application_evidence' USING errcode = '22023';
  END IF;

  SELECT * INTO v_opportunity
  FROM public.opportunities
  WHERE id = p_opportunity_id AND status = 'published'
  FOR SHARE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'opportunity_unavailable' USING errcode = '22023';
  END IF;

  INSERT INTO public.applications (opportunity_id, user_id, status, evidence)
  VALUES (p_opportunity_id, v_user_id, 'submitted', p_evidence)
  ON CONFLICT (opportunity_id, user_id) DO UPDATE
    SET evidence = EXCLUDED.evidence,
        status = CASE
          WHEN public.applications.status IN ('withdrawn', 'rejected') THEN 'submitted'
          ELSE public.applications.status
        END,
        updated_at = now()
  RETURNING * INTO v_application;

  RETURN jsonb_build_object(
    'application_id', v_application.id,
    'opportunity_id', v_application.opportunity_id,
    'status', v_application.status,
    'created_at', v_application.created_at,
    'updated_at', v_application.updated_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.withdraw_application(p_application_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_application public.applications;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  UPDATE public.applications
  SET status = 'withdrawn', updated_at = now()
  WHERE id = p_application_id
    AND user_id = v_user_id
    AND status IN ('submitted', 'reviewing', 'shortlisted')
  RETURNING * INTO v_application;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'application_unavailable' USING errcode = '22023';
  END IF;

  RETURN jsonb_build_object('application_id', v_application.id, 'status', v_application.status, 'updated_at', v_application.updated_at);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_marketplace(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_marketplace(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.get_my_applications(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_applications(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.apply_to_opportunity(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_to_opportunity(uuid, jsonb) TO authenticated;
REVOKE ALL ON FUNCTION public.withdraw_application(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.withdraw_application(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS opportunities_marketplace_status_created_idx
  ON public.opportunities (status, created_at DESC);
CREATE INDEX IF NOT EXISTS applications_user_status_created_idx
  ON public.applications (user_id, status, created_at DESC);
