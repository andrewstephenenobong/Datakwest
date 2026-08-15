-- DataKwest Universal Skill Intelligence Foundation: initial curated catalogue.
-- This seed is intentionally small: it establishes publishable launch paths and a starter graph.
-- Detailed learning objects will be added through governed content workflows.

insert into public.career_paths (slug, title, description, status, version, metadata)
values
  ('frontend-development', 'Frontend Development', 'Build websites and interfaces people enjoy using.', 'published', 1, '{"job_ready_range":"4-6 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('backend-development', 'Backend Development', 'Create APIs, databases, and reliable services.', 'published', 1, '{"job_ready_range":"5-7 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('full-stack-development', 'Full-Stack Development', 'Connect user experiences to complete working products.', 'published', 1, '{"job_ready_range":"7-10 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('data-analytics', 'Data Analytics', 'Turn spreadsheets, SQL, and dashboards into decisions.', 'published', 1, '{"job_ready_range":"3-5 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('ui-ux-design', 'UI/UX Design', 'Research needs and shape clearer digital experiences.', 'published', 1, '{"job_ready_range":"3-5 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('cybersecurity', 'Cybersecurity', 'Understand threats, systems, and practical digital defence.', 'published', 1, '{"job_ready_range":"6-12 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('cloud-devops', 'Cloud & DevOps', 'Ship, automate, and operate reliable software systems.', 'published', 1, '{"job_ready_range":"5-8 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('ai-automation', 'AI & Automation', 'Use AI, prompting, and workflows to multiply your impact.', 'published', 1, '{"job_ready_range":"4-8 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('digital-marketing', 'Digital Marketing', 'Create measurable growth through content and campaigns.', 'published', 1, '{"job_ready_range":"3-6 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb),
  ('business-productivity', 'Business & Productivity', 'Use digital systems and automation to work better.', 'published', 1, '{"job_ready_range":"2-4 months","pace_note":"Progress depends on practice time and project completion."}'::jsonb)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  version = excluded.version,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.skills (career_path_id, slug, title, description, level, status, rubric_version, canonical_slug, discovery_source)
select cp.id, x.slug, x.title, x.description, 'foundation', 'published', 1, 'curated:' || x.slug, 'curated'
from public.career_paths cp
join (values
  ('frontend-development', 'frontend-foundation', 'Frontend Foundations', 'Build responsive interfaces, components, and accessible interactions.'),
  ('backend-development', 'backend-foundation', 'Backend Foundations', 'Build APIs, data models, authentication, and reliable services.'),
  ('full-stack-development', 'full-stack-foundation', 'Full-Stack Foundations', 'Connect interfaces, application logic, data, and deployment.'),
  ('data-analytics', 'data-analytics-foundation', 'Data Analytics Foundations', 'Work with data, questions, spreadsheets, SQL, and clear communication.'),
  ('ui-ux-design', 'ui-ux-foundation', 'UI/UX Design Foundations', 'Understand users, structure flows, prototype ideas, and communicate decisions.'),
  ('cybersecurity', 'cybersecurity-foundation', 'Cybersecurity Foundations', 'Understand systems, threats, controls, and safe defensive practice.'),
  ('cloud-devops', 'cloud-devops-foundation', 'Cloud & DevOps Foundations', 'Understand infrastructure, deployment, automation, and reliability.'),
  ('ai-automation', 'ai-automation-foundation', 'AI & Automation Foundations', 'Use models and workflows responsibly to improve real work.'),
  ('digital-marketing', 'digital-marketing-foundation', 'Digital Marketing Foundations', 'Connect audiences, content, channels, experiments, and measurement.'),
  ('business-productivity', 'business-productivity-foundation', 'Business & Productivity Foundations', 'Organise work, communicate clearly, automate tasks, and make decisions with information.')
) as x(path_slug, slug, title, description) on x.path_slug = cp.slug
on conflict (career_path_id, slug) do update set
  title = excluded.title,
  description = excluded.description,
  status = excluded.status,
  canonical_slug = excluded.canonical_slug,
  discovery_source = excluded.discovery_source,
  updated_at = now();

insert into public.skill_graph_versions (skill_id, version_no, locale, status, methodology)
select s.id, 1, 'en', 'published', 'Foundations, guided practice, applied project, and evidence-based review.'
from public.skills s
where s.canonical_slug like 'curated:%'
on conflict (skill_id, version_no, locale) do update set
  status = excluded.status,
  methodology = excluded.methodology,
  published_at = coalesce(public.skill_graph_versions.published_at, now());

insert into public.skill_graph_nodes (skill_graph_version_id, node_key, node_type, title, description, level, order_index)
select v.id, n.node_key, n.node_type, n.title, n.description, n.level, n.order_index
from public.skill_graph_versions v
join public.skills s on s.id = v.skill_id
cross join (values
  ('foundations', 'concept', 'Foundations', 'Learn the vocabulary, tools, and mental models for the skill.', 1, 10),
  ('core-practice', 'practice', 'Core Practice', 'Use guided exercises to build reliable working habits.', 2, 20),
  ('applied-project', 'project', 'Applied Project', 'Create a practical artefact that demonstrates the skill in context.', 3, 30),
  ('verified-capability', 'assessment', 'Verified Capability', 'Explain and demonstrate what you can do without step-by-step support.', 4, 40)
) as n(node_key, node_type, title, description, level, order_index)
where v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict (skill_graph_version_id, node_key) do update set
  title = excluded.title,
  description = excluded.description,
  level = excluded.level,
  order_index = excluded.order_index;

insert into public.skill_graph_edges (skill_graph_version_id, from_node_id, to_node_id, edge_type, strength)
select v.id, from_node.id, to_node.id, 'prerequisite', 1.0
from public.skill_graph_versions v
cross join (values
  ('foundations', 'core-practice'),
  ('core-practice', 'applied-project'),
  ('applied-project', 'verified-capability')
) as edges(from_key, to_key)
join public.skill_graph_nodes from_node on from_node.skill_graph_version_id = v.id and from_node.node_key = edges.from_key
join public.skill_graph_nodes to_node on to_node.skill_graph_version_id = v.id and to_node.node_key = edges.to_key
where v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict (skill_graph_version_id, from_node_id, to_node_id, edge_type) do nothing;

comment on table public.career_paths is 'Launch catalogue paths; future unsupported skills enter through the universal discovery workflow.';
