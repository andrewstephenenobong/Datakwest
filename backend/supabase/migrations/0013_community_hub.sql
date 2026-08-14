-- DataKwest Phase 3: Community Hub foundation.
-- Community discovery and membership changes are server-authoritative.

CREATE TABLE IF NOT EXISTS public.community_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'owner')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'left', 'suspended')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

ALTER TABLE public.community_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own community memberships"
  ON public.community_memberships
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_community_hub()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_communities jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'slug', c.slug,
    'name', c.name,
    'description', c.description,
    'visibility', c.visibility,
    'membership_status', cm.status,
    'membership_role', cm.role,
    'joined_at', cm.joined_at,
    'group_count', (SELECT count(*) FROM public.groups g WHERE g.community_id = c.id)
  ) ORDER BY c.name), '[]'::jsonb)
  INTO v_communities
  FROM public.communities c
  LEFT JOIN public.community_memberships cm
    ON cm.community_id = c.id
   AND cm.user_id = v_user_id
   AND cm.status <> 'left'
  WHERE c.status = 'active'
    AND c.visibility IN ('public', 'organisation');

  RETURN jsonb_build_object('communities', v_communities, 'generated_at', now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.join_community(p_community_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_community public.communities;
  v_membership public.community_memberships;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  SELECT * INTO v_community
  FROM public.communities
  WHERE id = p_community_id
    AND status = 'active'
    AND visibility IN ('public', 'organisation')
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'community_unavailable' USING errcode = '22023';
  END IF;

  INSERT INTO public.community_memberships (community_id, user_id, role, status)
  VALUES (p_community_id, v_user_id, 'member', 'active')
  ON CONFLICT (community_id, user_id) DO UPDATE
    SET status = 'active'
  RETURNING * INTO v_membership;

  RETURN jsonb_build_object(
    'community_id', v_membership.community_id,
    'membership_status', v_membership.status,
    'membership_role', v_membership.role,
    'joined_at', v_membership.joined_at
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.leave_community(p_community_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_membership public.community_memberships;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  UPDATE public.community_memberships
  SET status = 'left'
  WHERE community_id = p_community_id
    AND user_id = v_user_id
    AND role = 'member'
  RETURNING * INTO v_membership;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'membership_unavailable' USING errcode = '22023';
  END IF;

  RETURN jsonb_build_object('community_id', v_membership.community_id, 'membership_status', v_membership.status);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_community_hub() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_community_hub() TO authenticated;
REVOKE ALL ON FUNCTION public.join_community(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_community(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.leave_community(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_community(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS community_memberships_user_status_idx
  ON public.community_memberships (user_id, status, joined_at DESC);
CREATE INDEX IF NOT EXISTS communities_status_visibility_idx
  ON public.communities (status, visibility, name);
