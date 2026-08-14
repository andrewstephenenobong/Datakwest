-- DataKwest Phase 3: peer-review workflow.
-- Review assignments and human review records are created and mutated through RPC-only paths.

CREATE TABLE IF NOT EXISTS public.peer_review_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'submitted', 'declined', 'cancelled')),
  due_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (submission_id, reviewer_id),
  CHECK (requester_id <> reviewer_id)
);

ALTER TABLE public.peer_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own peer review requests"
  ON public.peer_review_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = requester_id OR auth.uid() = reviewer_id);

CREATE OR REPLACE FUNCTION public.create_peer_review_request(
  p_submission_id uuid,
  p_reviewer_id uuid,
  p_due_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_submission public.submissions;
  v_request public.peer_review_requests;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_reviewer_id IS NULL OR p_reviewer_id = v_user_id THEN
    RAISE EXCEPTION 'invalid_reviewer' USING errcode = '22023';
  END IF;

  SELECT * INTO v_submission
  FROM public.submissions
  WHERE id = p_submission_id
    AND user_id = v_user_id
    AND status IN ('submitted', 'in_review', 'published')
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'submission_unavailable' USING errcode = '22023';
  END IF;

  INSERT INTO public.peer_review_requests (submission_id, requester_id, reviewer_id, due_at)
  VALUES (p_submission_id, v_user_id, p_reviewer_id, p_due_at)
  ON CONFLICT (submission_id, reviewer_id) DO UPDATE
    SET status = CASE
      WHEN public.peer_review_requests.status IN ('declined', 'cancelled') THEN 'pending'
      ELSE public.peer_review_requests.status
    END,
    due_at = EXCLUDED.due_at,
    updated_at = now()
  RETURNING * INTO v_request;

  RETURN jsonb_build_object(
    'request_id', v_request.id,
    'submission_id', v_request.submission_id,
    'requester_id', v_request.requester_id,
    'reviewer_id', v_request.reviewer_id,
    'status', v_request.status,
    'due_at', v_request.due_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_peer_review_workspace(p_limit integer DEFAULT 20)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_inbox jsonb;
  v_outbox jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid_limit' USING errcode = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'request_id', r.id,
    'submission_id', r.submission_id,
    'requester_id', r.requester_id,
    'status', r.status,
    'due_at', r.due_at,
    'created_at', r.created_at,
    'evidence', s.evidence,
    'reflection', s.reflection,
    'project_id', s.project_id
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_inbox
  FROM (
    SELECT * FROM public.peer_review_requests
    WHERE reviewer_id = v_user_id AND status IN ('pending', 'accepted')
    ORDER BY created_at DESC
    LIMIT p_limit
  ) r
  JOIN public.submissions s ON s.id = r.submission_id;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'request_id', r.id,
    'submission_id', r.submission_id,
    'reviewer_id', r.reviewer_id,
    'status', r.status,
    'due_at', r.due_at,
    'created_at', r.created_at,
    'review', CASE WHEN r.status = 'submitted' THEN (
      SELECT jsonb_build_object('score', rv.score, 'feedback', rv.feedback, 'created_at', rv.created_at)
      FROM public.reviews rv
      WHERE rv.submission_id = r.submission_id
        AND rv.reviewer_id = r.reviewer_id
        AND rv.review_type = 'human'
      ORDER BY rv.created_at DESC LIMIT 1
    ) ELSE NULL END
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO v_outbox
  FROM (
    SELECT * FROM public.peer_review_requests
    WHERE requester_id = v_user_id
    ORDER BY created_at DESC
    LIMIT p_limit
  ) r;

  RETURN jsonb_build_object('inbox', v_inbox, 'outbox', v_outbox);
END;
$function$;

CREATE OR REPLACE FUNCTION public.accept_peer_review(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.peer_review_requests;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  UPDATE public.peer_review_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = p_request_id
    AND reviewer_id = v_user_id
    AND status = 'pending'
  RETURNING * INTO v_request;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'review_request_unavailable' USING errcode = '22023';
  END IF;

  RETURN jsonb_build_object('request_id', v_request.id, 'status', v_request.status);
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_peer_review(
  p_request_id uuid,
  p_score numeric,
  p_feedback jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_request public.peer_review_requests;
  v_review public.reviews;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_score IS NULL OR p_score < 0 OR p_score > 100 THEN
    RAISE EXCEPTION 'invalid_review_score' USING errcode = '22023';
  END IF;
  IF p_feedback IS NULL OR jsonb_typeof(p_feedback) <> 'object' THEN
    RAISE EXCEPTION 'invalid_review_feedback' USING errcode = '22023';
  END IF;

  SELECT * INTO v_request
  FROM public.peer_review_requests
  WHERE id = p_request_id
    AND reviewer_id = v_user_id
    AND status IN ('pending', 'accepted')
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'review_request_unavailable' USING errcode = '22023';
  END IF;

  INSERT INTO public.reviews (submission_id, reviewer_id, review_type, rubric_version, score, feedback, status)
  VALUES (v_request.submission_id, v_user_id, 'human', 1, p_score, p_feedback, 'completed')
  RETURNING * INTO v_review;

  UPDATE public.peer_review_requests
  SET status = 'submitted', updated_at = now()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'request_id', p_request_id,
    'review_id', v_review.id,
    'score', v_review.score,
    'feedback', v_review.feedback,
    'status', 'submitted'
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.create_peer_review_request(uuid, uuid, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_peer_review_request(uuid, uuid, timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.get_peer_review_workspace(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_peer_review_workspace(integer) TO authenticated;
REVOKE ALL ON FUNCTION public.accept_peer_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_peer_review(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.submit_peer_review(uuid, numeric, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_peer_review(uuid, numeric, jsonb) TO authenticated;

CREATE INDEX IF NOT EXISTS peer_review_requests_reviewer_status_idx
  ON public.peer_review_requests (reviewer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS peer_review_requests_requester_status_idx
  ON public.peer_review_requests (requester_id, status, created_at DESC);
