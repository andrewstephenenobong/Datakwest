-- Datakwest Phase 2: Career Centre evidence and preparation workspace.
CREATE OR REPLACE FUNCTION public.get_career_centre()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_readiness jsonb;
  v_projects jsonb;
  v_interviews jsonb;
  v_applications jsonb;
  v_opportunities jsonb;
  v_actions jsonb := '[]'::jsonb;
  v_factors jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  v_readiness := public.get_readiness_score();
  v_factors := coalesce(v_readiness -> 'factors', '{}'::jsonb);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'submission_id', s.id,
    'project_id', p.id,
    'title', p.title,
    'status', s.status,
    'ai_score', s.ai_score,
    'visibility', s.visibility,
    'submitted_at', s.submitted_at,
    'updated_at', s.updated_at
  ) ORDER BY s.updated_at DESC), '[]'::jsonb)
  INTO v_projects
  FROM public.submissions s
  JOIN public.projects p ON p.id = s.project_id
  WHERE s.user_id = v_user_id
  LIMIT 8;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'session_id', i.id,
    'title', t.title,
    'interview_type', t.interview_type,
    'status', i.status,
    'total_score', i.total_score,
    'locale', i.locale,
    'evidence_fresh_until', i.evidence_fresh_until,
    'evaluated_at', i.evaluated_at
  ) ORDER BY coalesce(i.evaluated_at, i.updated_at) DESC), '[]'::jsonb)
  INTO v_interviews
  FROM public.interview_sessions i
  JOIN public.interview_templates t ON t.id = i.template_id
  WHERE i.user_id = v_user_id
  LIMIT 8;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'application_id', a.id,
    'opportunity_id', a.opportunity_id,
    'title', o.title,
    'organisation_name', org.name,
    'opportunity_type', o.opportunity_type,
    'status', a.status,
    'created_at', a.created_at
  ) ORDER BY a.updated_at DESC), '[]'::jsonb)
  INTO v_applications
  FROM public.applications a
  JOIN public.opportunities o ON o.id = a.opportunity_id
  LEFT JOIN public.organisations org ON org.id = o.organisation_id
  WHERE a.user_id = v_user_id
  LIMIT 8;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'title', o.title,
    'organisation_name', org.name,
    'opportunity_type', o.opportunity_type,
    'description', o.description,
    'requirements', o.requirements,
    'created_at', o.created_at
  ) ORDER BY o.created_at DESC), '[]'::jsonb)
  INTO v_opportunities
  FROM public.opportunities o
  LEFT JOIN public.organisations org ON org.id = o.organisation_id
  WHERE o.status = 'published'
  LIMIT 6;

  IF coalesce((v_factors ->> 'interview_average')::numeric, 0) < 60 THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object('key', 'interview', 'title', 'Practise one interview response', 'reason', 'Interview evidence is the next way to make your readiness profile more complete.', 'route', '/interviews'));
  END IF;
  IF coalesce((v_factors ->> 'reviewed_projects')::numeric, 0) < 50 THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object('key', 'project', 'title', 'Strengthen one project proof', 'reason', 'A reviewed project gives your skills evidence that you can explain and share.', 'route', '/project'));
  END IF;
  IF coalesce((v_factors ->> 'practice_average')::numeric, 0) < 60 THEN
    v_actions := v_actions || jsonb_build_array(jsonb_build_object('key', 'practice', 'title', 'Complete a focused practice session', 'reason', 'Consistent practice helps turn learning into durable skill.', 'route', '/practice'));
  END IF;
  IF jsonb_array_length(v_actions) = 0 THEN
    v_actions := jsonb_build_array(jsonb_build_object('key', 'opportunity', 'title', 'Review a matched opportunity', 'reason', 'Your evidence is building. Explore a role or project where you can apply it.', 'route', '/marketplace'));
  END IF;

  RETURN jsonb_build_object(
    'readiness', v_readiness,
    'projects', v_projects,
    'interviews', v_interviews,
    'applications', v_applications,
    'opportunities', v_opportunities,
    'next_actions', v_actions,
    'generated_at', now()
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_career_centre() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_career_centre() TO authenticated;
