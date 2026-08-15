-- Custom owl audio library: private learner uploads plus admin-approved shared sounds.
-- Audio objects are stored in a private bucket and are never exposed by public URLs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'datakwest-owl-audio',
  'datakwest-owl-audio',
  false,
  2097152,
  ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4']::text[];

CREATE TABLE IF NOT EXISTS public.owl_audio_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
  storage_path text NOT NULL UNIQUE,
  mime_type text NOT NULL CHECK (mime_type IN ('audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4')),
  file_size_bytes integer NOT NULL CHECK (file_size_bytes BETWEEN 1 AND 2097152),
  duration_ms integer NOT NULL CHECK (duration_ms BETWEEN 100 AND 5000),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  rejection_reason text NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS owl_audio_assets_owner_status_idx
  ON public.owl_audio_assets(owner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS owl_audio_assets_shared_idx
  ON public.owl_audio_assets(visibility, status, created_at DESC);

ALTER TABLE public.owl_audio_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owl_audio_assets_select_own_or_approved ON public.owl_audio_assets;
CREATE POLICY owl_audio_assets_select_own_or_approved
  ON public.owl_audio_assets FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR (visibility = 'shared' AND status = 'approved'));

DROP POLICY IF EXISTS owl_audio_assets_no_direct_insert ON public.owl_audio_assets;
CREATE POLICY owl_audio_assets_no_direct_insert
  ON public.owl_audio_assets FOR INSERT TO authenticated
  WITH CHECK (false);
DROP POLICY IF EXISTS owl_audio_assets_no_direct_update ON public.owl_audio_assets;
CREATE POLICY owl_audio_assets_no_direct_update
  ON public.owl_audio_assets FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);
DROP POLICY IF EXISTS owl_audio_assets_no_direct_delete ON public.owl_audio_assets;
CREATE POLICY owl_audio_assets_no_direct_delete
  ON public.owl_audio_assets FOR DELETE TO authenticated
  USING (false);

DROP POLICY IF EXISTS owl_audio_storage_insert_own_folder ON storage.objects;
CREATE POLICY owl_audio_storage_insert_own_folder
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'datakwest-owl-audio'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS owl_audio_storage_select_own_or_approved ON storage.objects;
CREATE POLICY owl_audio_storage_select_own_or_approved
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'datakwest-owl-audio'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.owl_audio_assets a
        WHERE a.storage_path = name
          AND a.visibility = 'shared'
          AND a.status = 'approved'
      )
    )
  );

DROP POLICY IF EXISTS owl_audio_storage_delete_own_folder ON storage.objects;
CREATE POLICY owl_audio_storage_delete_own_folder
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'datakwest-owl-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE OR REPLACE FUNCTION public.register_owl_audio_asset(
  p_name text,
  p_storage_path text,
  p_mime_type text,
  p_file_size_bytes integer,
  p_duration_ms integer
)
RETURNS public.owl_audio_assets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_user_id uuid := auth.uid(); v_asset public.owl_audio_assets;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF char_length(trim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 80 THEN RAISE EXCEPTION 'invalid_audio_name' USING errcode = '22023'; END IF;
  IF p_storage_path IS NULL OR p_storage_path NOT LIKE v_user_id::text || '/%' THEN RAISE EXCEPTION 'invalid_audio_path' USING errcode = '42501'; END IF;
  IF p_mime_type NOT IN ('audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/mp4') THEN RAISE EXCEPTION 'unsupported_audio_type' USING errcode = '22023'; END IF;
  IF p_file_size_bytes NOT BETWEEN 1 AND 2097152 THEN RAISE EXCEPTION 'audio_file_too_large' USING errcode = '22023'; END IF;
  IF p_duration_ms NOT BETWEEN 100 AND 5000 THEN RAISE EXCEPTION 'audio_duration_invalid' USING errcode = '22023'; END IF;
  INSERT INTO public.owl_audio_assets (owner_id, name, storage_path, mime_type, file_size_bytes, duration_ms)
  VALUES (v_user_id, trim(p_name), p_storage_path, p_mime_type, p_file_size_bytes, p_duration_ms)
  RETURNING * INTO v_asset;
  RETURN v_asset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_owl_audio_library()
RETURNS SETOF public.owl_audio_assets
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $function$
  SELECT * FROM public.owl_audio_assets
  WHERE owner_id = auth.uid()
     OR (visibility = 'shared' AND status = 'approved')
  ORDER BY visibility DESC, created_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.approve_owl_audio_asset(p_asset_id uuid, p_shared boolean DEFAULT true)
RETURNS public.owl_audio_assets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_asset public.owl_audio_assets;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF NOT public.has_admin_permission('moderation:write') THEN RAISE EXCEPTION 'admin_permission_required' USING errcode = '42501'; END IF;
  UPDATE public.owl_audio_assets
  SET status = 'approved', visibility = CASE WHEN p_shared THEN 'shared' ELSE 'private' END, approved_by = auth.uid(), approved_at = now(), updated_at = now(), rejection_reason = ''
  WHERE id = p_asset_id
  RETURNING * INTO v_asset;
  IF v_asset.id IS NULL THEN RAISE EXCEPTION 'audio_asset_not_found' USING errcode = '22023'; END IF;
  INSERT INTO public.admin_audit_log (actor_id, action, target_type, target_id, reason, after_state)
  VALUES (auth.uid(), 'owl_audio_approved', 'owl_audio_asset', v_asset.id, 'approved by admin', jsonb_build_object('visibility', v_asset.visibility));
  RETURN v_asset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.archive_owl_audio_asset(p_asset_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
DECLARE v_asset public.owl_audio_assets;
BEGIN
  SELECT * INTO v_asset FROM public.owl_audio_assets WHERE id = p_asset_id FOR UPDATE;
  IF v_asset.id IS NULL THEN RETURN false; END IF;
  IF v_asset.owner_id <> auth.uid() AND NOT public.has_admin_permission('moderation:write') THEN RAISE EXCEPTION 'not_allowed' USING errcode = '42501'; END IF;
  UPDATE public.owl_audio_assets SET status = 'archived', updated_at = now() WHERE id = p_asset_id;
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.register_owl_audio_asset(text, text, text, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owl_audio_library() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_owl_audio_asset(uuid, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.archive_owl_audio_asset(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_owl_audio_asset(text, text, text, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_owl_audio_library() TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_owl_audio_asset(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_owl_audio_asset(uuid) TO authenticated;
COMMENT ON TABLE public.owl_audio_assets IS 'Private learner owl sounds and admin-approved shared sounds; audio objects live in a private storage bucket.';
COMMIT;

