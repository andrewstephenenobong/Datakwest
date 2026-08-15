CREATE OR REPLACE FUNCTION public.get_owl_audio_moderation_queue()
RETURNS SETOF public.owl_audio_assets
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING errcode = '42501'; END IF;
  IF NOT public.has_admin_permission('moderation:read') THEN RAISE EXCEPTION 'admin_permission_required' USING errcode = '42501'; END IF;
  RETURN QUERY
    SELECT * FROM public.owl_audio_assets
    WHERE status = 'pending'
    ORDER BY created_at ASC;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_owl_audio_moderation_queue() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owl_audio_moderation_queue() TO authenticated;
