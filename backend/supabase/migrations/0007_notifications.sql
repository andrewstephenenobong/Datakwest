-- DataKwest MVP feature: learner notification center.
-- Notification creation remains server/admin-only; learners can read and mark their own items read through an RPC.

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_read_at timestamptz := now();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING errcode = '42501';
  END IF;

  UPDATE public.notifications
  SET read_at = coalesce(read_at, v_read_at)
  WHERE id = p_notification_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'notification_not_found' USING errcode = 'P0002';
  END IF;

  RETURN jsonb_build_object(
    'notification_id', p_notification_id,
    'read_at', v_read_at
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_notification_read(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS notifications_user_read_created_idx
  ON public.notifications (user_id, read_at, created_at desc);
