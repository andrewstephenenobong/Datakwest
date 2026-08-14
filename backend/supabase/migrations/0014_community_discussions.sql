-- DataKwest Phase 3: moderated community discussions.
-- Post creation and reporting are RPC-only; moderation-sensitive fields remain server-controlled.

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('pending', 'published', 'hidden', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL CHECK (reason IN ('harassment', 'spam', 'unsafe', 'privacy', 'other')),
  details text NOT NULL DEFAULT '' CHECK (char_length(details) <= 2000),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view published posts in active communities"
  ON public.community_posts
  FOR SELECT TO authenticated
  USING (status = 'published' AND EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = community_id AND c.status = 'active'
  ));

CREATE POLICY "Users can view own community posts"
  ON public.community_posts
  FOR SELECT TO authenticated
  USING (auth.uid() = author_id);

CREATE POLICY "Users can view own community reports"
  ON public.community_reports
  FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id);

CREATE OR REPLACE FUNCTION public.get_community_feed(
  p_community_id uuid,
  p_limit integer DEFAULT 20,
  p_before timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_posts jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_limit < 1 OR p_limit > 50 THEN
    RAISE EXCEPTION 'invalid_limit' USING errcode = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = p_community_id AND c.status = 'active'
      AND c.visibility IN ('public', 'organisation')
  ) THEN
    RAISE EXCEPTION 'community_unavailable' USING errcode = '22023';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'community_id', p.community_id,
    'author_id', p.author_id,
    'body', p.body,
    'created_at', p.created_at,
    'updated_at', p.updated_at
  ) ORDER BY p.created_at DESC), '[]'::jsonb)
  INTO v_posts
  FROM (
    SELECT *
    FROM public.community_posts
    WHERE community_id = p_community_id
      AND status = 'published'
      AND (p_before IS NULL OR created_at < p_before)
    ORDER BY created_at DESC
    LIMIT p_limit
  ) p;

  RETURN jsonb_build_object('community_id', p_community_id, 'posts', v_posts);
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_community_post(
  p_community_id uuid,
  p_body text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_post public.community_posts;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF char_length(trim(coalesce(p_body, ''))) NOT BETWEEN 1 AND 4000 THEN
    RAISE EXCEPTION 'invalid_post_body' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.communities c
    JOIN public.community_memberships cm ON cm.community_id = c.id
    WHERE c.id = p_community_id
      AND c.status = 'active'
      AND c.visibility IN ('public', 'organisation')
      AND cm.user_id = v_user_id
      AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'membership_required' USING errcode = '42501';
  END IF;

  INSERT INTO public.community_posts (community_id, author_id, body, status)
  VALUES (p_community_id, v_user_id, trim(p_body), 'published')
  RETURNING * INTO v_post;

  RETURN jsonb_build_object(
    'id', v_post.id,
    'community_id', v_post.community_id,
    'author_id', v_post.author_id,
    'body', v_post.body,
    'status', v_post.status,
    'created_at', v_post.created_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.report_community_post(
  p_post_id uuid,
  p_reason text,
  p_details text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_report public.community_reports;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;
  IF p_reason NOT IN ('harassment', 'spam', 'unsafe', 'privacy', 'other') THEN
    RAISE EXCEPTION 'invalid_report_reason' USING errcode = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_posts WHERE id = p_post_id AND status = 'published') THEN
    RAISE EXCEPTION 'post_unavailable' USING errcode = '22023';
  END IF;

  INSERT INTO public.community_reports (post_id, reporter_id, reason, details)
  VALUES (p_post_id, v_user_id, p_reason, coalesce(p_details, ''))
  ON CONFLICT (post_id, reporter_id) DO UPDATE
    SET reason = EXCLUDED.reason, details = EXCLUDED.details, status = 'open'
  RETURNING * INTO v_report;

  RETURN jsonb_build_object('report_id', v_report.id, 'status', v_report.status);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_community_feed(uuid, integer, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_feed(uuid, integer, timestamptz) TO authenticated;
REVOKE ALL ON FUNCTION public.create_community_post(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_community_post(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.report_community_post(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_community_post(uuid, text, text) TO authenticated;

CREATE INDEX IF NOT EXISTS community_posts_feed_idx
  ON public.community_posts (community_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS community_reports_moderation_idx
  ON public.community_reports (status, created_at DESC);
