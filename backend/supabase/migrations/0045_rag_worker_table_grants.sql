-- The embedding worker runs with service_role but table privileges remain explicit.
GRANT SELECT ON TABLE public.source_documents TO service_role;
GRANT SELECT, UPDATE ON TABLE public.source_chunks TO service_role;
