-- Restore the missing privilege required by the onboarding profile upsert.
-- RLS remains the ownership boundary: users must still satisfy the existing
-- profiles INSERT policy for their own auth.uid()-owned row.
grant insert on table public.profiles to authenticated;
