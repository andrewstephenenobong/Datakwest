-- Datakwest Phase 4: platform governance and moderation foundation.
-- All consequential mutations remain RPC-only and require authenticated, scoped actors.

CREATE TABLE IF NOT EXISTS public.platform_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_key text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  configuration jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'retired')),
  effective_at timestamptz,
  supersedes_id uuid REFERENCES public.platform_policies(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_key, version)
);

CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
  role text NOT NULL CHECK (role IN ('community_moderator', 'senior_trust_reviewer', 'curriculum_reviewer', 'organisation_admin', 'support_operator', 'platform_operator', 'security_auditor')),
  permission text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);

CREATE TABLE IF NOT EXISTS public.admin_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('community_moderator', 'senior_trust_reviewer', 'curriculum_reviewer', 'organisation_admin', 'support_operator', 'platform_operator', 'security_auditor')),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  expires_at timestamptz,
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > created_at)
);

CREATE TABLE IF NOT EXISTS public.admin_access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.admin_assignments(id) ON DELETE CASCADE,
  subject_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'revoked', 'expired', 'pending')),
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  subject_type text NOT NULL CHECK (subject_type IN ('post', 'account', 'listing', 'submission', 'challenge', 'message', 'other')),
  subject_id uuid,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  queue text NOT NULL DEFAULT 'community' CHECK (queue IN ('community', 'marketplace', 'account_safety', 'curriculum', 'challenge', 'support')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'actioned', 'appealed', 'resolved', 'dismissed')),
  policy_id uuid REFERENCES public.platform_policies(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_code text,
  resolution_rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.moderation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  subject_type text NOT NULL,
  subject_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('harassment', 'spam', 'unsafe', 'privacy', 'fraud', 'copyright', 'other')),
  details text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high', 'critical')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'linked', 'withdrawn')),
  deduplication_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deduplication_key, reporter_id)
);

CREATE TABLE IF NOT EXISTS public.moderation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  captured_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  evidence_hash text NOT NULL,
  storage_path text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  classifier_result jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('warn', 'hide_content', 'limit_posting', 'freeze_listing', 'pause_submission', 'suspend_account', 'restore_content', 'dismiss')),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason_code text NOT NULL,
  rationale text NOT NULL,
  policy_id uuid REFERENCES public.platform_policies(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reversible boolean NOT NULL DEFAULT true,
  effective_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at IS NULL OR expires_at > effective_at)
);

CREATE TABLE IF NOT EXISTS public.moderation_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  appellant_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  grounds text NOT NULL CHECK (char_length(trim(grounds)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'upheld', 'overturned', 'dismissed')),
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  outcome_rationale text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  UNIQUE (case_id, appellant_id)
);

CREATE TABLE IF NOT EXISTS public.moderation_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.moderation_cases(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note text NOT NULL CHECK (char_length(trim(note)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  reason text NOT NULL DEFAULT '',
  before_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  after_state jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_id text,
  correlation_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.domain_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1 CHECK (schema_version > 0),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE SET NULL,
  subject_type text,
  subject_id uuid,
  request_id text,
  correlation_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.outbox_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.domain_events(id) ON DELETE SET NULL,
  job_type text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'dead_letter')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  locked_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS moderation_cases_queue_idx ON public.moderation_cases (queue, status, priority, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_reports_subject_idx ON public.moderation_reports (subject_type, subject_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_appeals_queue_idx ON public.moderation_appeals (status, created_at ASC);
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS domain_events_type_idx ON public.domain_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS outbox_jobs_ready_idx ON public.outbox_jobs (status, available_at ASC);

ALTER TABLE public.platform_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_access_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbox_jobs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_admin_permission(p_permission text, p_organisation_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_assignments aa
    JOIN public.admin_role_permissions arp ON arp.role = aa.role
    WHERE aa.user_id = auth.uid()
      AND aa.status = 'active'
      AND (aa.expires_at IS NULL OR aa.expires_at > now())
      AND arp.permission = p_permission
      AND (aa.organisation_id IS NULL OR aa.organisation_id = p_organisation_id)
  );
$function$;

CREATE OR REPLACE FUNCTION public.create_moderation_report(
  p_subject_type text,
  p_subject_id uuid,
  p_category text,
  p_details text DEFAULT '',
  p_idempotency_key text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_case public.moderation_cases;
  v_report public.moderation_reports;
  v_key text := nullif(trim(p_idempotency_key), '');
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF p_subject_type NOT IN ('post', 'account', 'listing', 'submission', 'challenge', 'message', 'other') THEN RAISE EXCEPTION 'invalid_subject_type' USING errcode = '22023'; END IF;
  IF p_category NOT IN ('harassment', 'spam', 'unsafe', 'privacy', 'fraud', 'copyright', 'other') THEN RAISE EXCEPTION 'invalid_report_category' USING errcode = '22023'; END IF;
  IF char_length(trim(coalesce(p_details, ''))) > 4000 THEN RAISE EXCEPTION 'invalid_report_details' USING errcode = '22023'; END IF;
  IF v_key IS NULL THEN v_key := md5(v_user_id::text || ':' || p_subject_type || ':' || p_subject_id::text); END IF;

  SELECT mc.* INTO v_case
  FROM public.moderation_cases mc
  JOIN public.moderation_reports mr ON mr.case_id = mc.id
  WHERE mr.reporter_id = v_user_id AND mr.deduplication_key = v_key
  LIMIT 1;
  IF v_case.id IS NOT NULL THEN
    SELECT * INTO v_report FROM public.moderation_reports WHERE case_id = v_case.id AND reporter_id = v_user_id LIMIT 1;
    RETURN jsonb_build_object('case_id', v_case.id, 'report_id', v_report.id, 'status', v_case.status, 'deduplicated', true);
  END IF;

  INSERT INTO public.moderation_cases (subject_type, subject_id, queue, priority, opened_by)
  VALUES (p_subject_type, p_subject_id, CASE WHEN p_subject_type = 'listing' THEN 'marketplace' ELSE 'community' END, 'normal', v_user_id)
  RETURNING * INTO v_case;
  INSERT INTO public.moderation_reports (case_id, reporter_id, subject_type, subject_id, category, details, deduplication_key)
  VALUES (v_case.id, v_user_id, p_subject_type, p_subject_id, p_category, trim(coalesce(p_details, '')), v_key)
  RETURNING * INTO v_report;
  INSERT INTO public.domain_events (event_type, actor_id, subject_type, subject_id, payload)
  VALUES ('moderation_reported', v_user_id, p_subject_type, p_subject_id, jsonb_build_object('case_id', v_case.id, 'report_id', v_report.id, 'category', p_category));
  INSERT INTO public.outbox_jobs (job_type, idempotency_key, payload)
  VALUES ('moderation_case_created', 'moderation_case_created:' || v_case.id::text, jsonb_build_object('case_id', v_case.id));
  RETURN jsonb_build_object('case_id', v_case.id, 'report_id', v_report.id, 'status', v_case.status, 'deduplicated', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_moderation_queue(
  p_queue text DEFAULT NULL,
  p_status text DEFAULT 'open',
  p_limit integer DEFAULT 25,
  p_before timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_user_id uuid := auth.uid(); v_cases jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'invalid_limit' USING errcode = '22023'; END IF;
  IF NOT public.has_admin_permission('moderation:read') THEN RAISE EXCEPTION 'admin_permission_required' USING errcode = '42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(q) ORDER BY q.created_at DESC), '[]'::jsonb) INTO v_cases
  FROM (
    SELECT mc.id, mc.case_number, mc.subject_type, mc.subject_id, mc.queue, mc.priority, mc.status, mc.assigned_to, mc.created_at, mc.updated_at
    FROM public.moderation_cases mc
    WHERE (p_queue IS NULL OR mc.queue = p_queue)
      AND (p_status IS NULL OR mc.status = p_status)
      AND (p_before IS NULL OR mc.created_at < p_before)
      AND (mc.organisation_id IS NULL OR public.has_admin_permission('moderation:read', mc.organisation_id))
    ORDER BY mc.created_at DESC
    LIMIT p_limit
  ) q;
  RETURN jsonb_build_object('cases', v_cases, 'next_before', CASE WHEN jsonb_array_length(v_cases) = p_limit THEN (v_cases->-1->>'created_at')::timestamptz ELSE NULL END);
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_moderation_case(p_case_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_user_id uuid := auth.uid(); v_case public.moderation_cases;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF NOT public.has_admin_permission('moderation:claim') THEN RAISE EXCEPTION 'admin_permission_required' USING errcode = '42501'; END IF;
  UPDATE public.moderation_cases SET assigned_to = v_user_id, status = CASE WHEN status = 'open' THEN 'in_review' ELSE status END, updated_at = now()
  WHERE id = p_case_id AND status IN ('open', 'in_review')
  RETURNING * INTO v_case;
  IF v_case.id IS NULL THEN RAISE EXCEPTION 'case_unavailable' USING errcode = '22023'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, organisation_id, action, target_type, target_id, reason, after_state)
  VALUES (v_user_id, v_case.organisation_id, 'moderation_case_claimed', 'moderation_case', v_case.id, 'case review assignment', jsonb_build_object('assigned_to', v_user_id, 'status', v_case.status));
  RETURN jsonb_build_object('case_id', v_case.id, 'assigned_to', v_case.assigned_to, 'status', v_case.status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_moderation_action(
  p_case_id uuid,
  p_action_type text,
  p_reason_code text,
  p_rationale text,
  p_duration_minutes integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_user_id uuid := auth.uid(); v_case public.moderation_cases; v_action public.moderation_actions;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF NOT public.has_admin_permission('moderation:write') THEN RAISE EXCEPTION 'admin_permission_required' USING errcode = '42501'; END IF;
  IF p_action_type NOT IN ('warn', 'hide_content', 'limit_posting', 'freeze_listing', 'pause_submission', 'suspend_account', 'restore_content', 'dismiss') THEN RAISE EXCEPTION 'invalid_moderation_action' USING errcode = '22023'; END IF;
  IF char_length(trim(coalesce(p_reason_code, ''))) NOT BETWEEN 1 AND 120 OR char_length(trim(coalesce(p_rationale, ''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid_moderation_rationale' USING errcode = '22023'; END IF;
  IF p_duration_minutes IS NOT NULL AND (p_duration_minutes < 1 OR p_duration_minutes > 43200) THEN RAISE EXCEPTION 'invalid_moderation_duration' USING errcode = '22023'; END IF;
  SELECT * INTO v_case FROM public.moderation_cases WHERE id = p_case_id FOR UPDATE;
  IF v_case.id IS NULL THEN RAISE EXCEPTION 'case_not_found' USING errcode = '22023'; END IF;
  IF v_case.assigned_to IS NOT NULL AND v_case.assigned_to <> v_user_id AND NOT public.has_admin_permission('moderation:override') THEN RAISE EXCEPTION 'case_assignment_required' USING errcode = '42501'; END IF;
  INSERT INTO public.moderation_actions (case_id, action_type, reason_code, rationale, policy_id, actor_id, expires_at)
  VALUES (v_case.id, p_action_type, trim(p_reason_code), trim(p_rationale), v_case.policy_id, v_user_id, CASE WHEN p_duration_minutes IS NULL THEN NULL ELSE now() + make_interval(mins => p_duration_minutes) END)
  RETURNING * INTO v_action;
  UPDATE public.moderation_cases SET status = CASE WHEN p_action_type = 'dismiss' THEN 'dismissed' ELSE 'actioned' END, resolved_by = v_user_id, resolution_code = p_reason_code, resolution_rationale = p_rationale, resolved_at = now(), updated_at = now() WHERE id = v_case.id;
  INSERT INTO public.admin_audit_log (actor_id, organisation_id, action, target_type, target_id, reason, before_state, after_state)
  VALUES (v_user_id, v_case.organisation_id, 'moderation_action_applied', 'moderation_case', v_case.id, p_reason_code, jsonb_build_object('status', v_case.status), jsonb_build_object('status', CASE WHEN p_action_type = 'dismiss' THEN 'dismissed' ELSE 'actioned' END, 'action_type', p_action_type));
  INSERT INTO public.domain_events (event_type, actor_id, organisation_id, subject_type, subject_id, payload)
  VALUES ('moderation_action_applied', v_user_id, v_case.organisation_id, v_case.subject_type, v_case.subject_id, jsonb_build_object('case_id', v_case.id, 'action_id', v_action.id, 'action_type', p_action_type));
  RETURN jsonb_build_object('case_id', v_case.id, 'action_id', v_action.id, 'status', CASE WHEN p_action_type = 'dismiss' THEN 'dismissed' ELSE 'actioned' END);
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_moderation_appeal(p_case_id uuid, p_grounds text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_user_id uuid := auth.uid(); v_case public.moderation_cases; v_appeal public.moderation_appeals;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF char_length(trim(coalesce(p_grounds, ''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid_appeal_grounds' USING errcode = '22023'; END IF;
  SELECT * INTO v_case FROM public.moderation_cases WHERE id = p_case_id AND status IN ('actioned', 'resolved') FOR UPDATE;
  IF v_case.id IS NULL THEN RAISE EXCEPTION 'appeal_unavailable' USING errcode = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.moderation_actions WHERE case_id = p_case_id AND actor_id IS DISTINCT FROM v_user_id) THEN
    RAISE EXCEPTION 'appeal_not_eligible' USING errcode = '42501';
  END IF;
  INSERT INTO public.moderation_appeals (case_id, appellant_id, grounds) VALUES (p_case_id, v_user_id, trim(p_grounds)) RETURNING * INTO v_appeal;
  UPDATE public.moderation_cases SET status = 'appealed', updated_at = now() WHERE id = p_case_id;
  RETURN jsonb_build_object('appeal_id', v_appeal.id, 'case_id', p_case_id, 'status', v_appeal.status);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'appeal_already_submitted' USING errcode = '23505';
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_audit_events(p_limit integer DEFAULT 50, p_before timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE v_user_id uuid := auth.uid(); v_events jsonb;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF p_limit < 1 OR p_limit > 100 THEN RAISE EXCEPTION 'invalid_limit' USING errcode = '22023'; END IF;
  IF NOT public.has_admin_permission('audit:read') THEN RAISE EXCEPTION 'admin_permission_required' USING errcode = '42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC), '[]'::jsonb) INTO v_events
  FROM (SELECT id, actor_id, organisation_id, action, target_type, target_id, reason, before_state, after_state, request_id, correlation_id, created_at FROM public.admin_audit_log WHERE (p_before IS NULL OR created_at < p_before) ORDER BY created_at DESC LIMIT p_limit) a;
  RETURN jsonb_build_object('events', v_events);
END;
$function$;

INSERT INTO public.admin_role_permissions (role, permission) VALUES
  ('community_moderator', 'moderation:read'), ('community_moderator', 'moderation:claim'), ('community_moderator', 'moderation:write'),
  ('senior_trust_reviewer', 'moderation:read'), ('senior_trust_reviewer', 'moderation:claim'), ('senior_trust_reviewer', 'moderation:write'), ('senior_trust_reviewer', 'moderation:override'), ('senior_trust_reviewer', 'audit:read'),
  ('platform_operator', 'moderation:read'), ('platform_operator', 'moderation:claim'), ('platform_operator', 'moderation:write'), ('platform_operator', 'moderation:override'), ('platform_operator', 'audit:read'),
  ('security_auditor', 'audit:read')
ON CONFLICT DO NOTHING;

REVOKE ALL ON FUNCTION public.has_admin_permission(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_moderation_report(text, uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_moderation_queue(text, text, integer, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_moderation_case(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_moderation_action(uuid, text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_moderation_appeal(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_admin_audit_events(integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_moderation_report(text, uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_moderation_queue(text, text, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_moderation_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_moderation_action(uuid, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_moderation_appeal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_audit_events(integer, timestamptz) TO authenticated;

-- No table write policies are granted to clients. Reports, cases, actions, appeals, audits, events, and jobs are RPC/service-only.
