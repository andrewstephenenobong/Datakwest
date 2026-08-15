-- Universal Skill Engine service-role write grants.
-- Learner-facing RLS and publication status remain unchanged; only server workers receive write access.
grant select, insert, update on public.skills to service_role;
grant select, insert, update on public.skill_graph_versions to service_role;
grant select, insert, update on public.skill_graph_nodes to service_role;
grant select, insert, update on public.skill_graph_edges to service_role;
grant select on public.career_paths to service_role;
