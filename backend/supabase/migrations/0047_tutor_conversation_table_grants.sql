-- Table privileges are paired with the existing auth.uid()-scoped RLS policies.
GRANT SELECT, INSERT ON TABLE public.conversations TO authenticated;
GRANT SELECT, INSERT ON TABLE public.messages TO authenticated;
