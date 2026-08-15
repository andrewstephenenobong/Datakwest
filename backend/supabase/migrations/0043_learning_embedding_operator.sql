-- Controlled operational permission for approved source embedding ingestion.
-- No learner role receives this permission; only platform_operator can invoke the admin trigger.
INSERT INTO public.admin_role_permissions (role, permission)
VALUES ('platform_operator', 'learning:embed')
ON CONFLICT DO NOTHING;
