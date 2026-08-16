-- DataKwest skill catalogue read grant repair.
-- RLS policies already restrict rows to published content; this restores the
-- table-level SELECT privilege required by PostgREST for authenticated learners.

grant select on table public.skills to authenticated;
grant select on table public.skill_graph_versions to authenticated;

grant select on table public.skill_graph_nodes to authenticated;
grant select on table public.skill_graph_edges to authenticated;

comment on table public.skill_graph_versions is
  'Immutable, versioned skill graph releases. Authenticated learners may read only published rows via RLS.';
