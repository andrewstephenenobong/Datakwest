-- Server-authoritative permission check for operational learning ingestion.
-- The caller must first authenticate the user; this function only evaluates the verified user ID.
CREATE OR REPLACE FUNCTION public.has_user_admin_permission(
  p_user_id uuid,
  p_permission text
)
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
    WHERE aa.user_id = p_user_id
      AND aa.status = 'active'
      AND (aa.expires_at IS NULL OR aa.expires_at > now())
      AND arp.permission = p_permission
  );
$function$;

REVOKE ALL ON FUNCTION public.has_user_admin_permission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_user_admin_permission(uuid, text) TO service_role;
