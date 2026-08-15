-- Flagship vertical slice: Cybersecurity foundations through evidence.
-- Content is deliberately scoped to a safe, defensive beginner pathway.

insert into public.skill_graph_nodes (
  skill_graph_version_id, node_key, node_type, title, description, level, order_index, metadata
)
select v.id, n.node_key, n.node_type, n.title, n.description, n.level, n.order_index, n.metadata
from public.skill_graph_versions v
join public.skills s on s.id = v.skill_id
cross join (values
  ('cyber-systems-basics', 'concept', 'Systems and Trust Boundaries', 'Understand users, assets, data flows, and where trust changes inside a system.', 1, 5, '{"flagship":true,"safe_scope":"defensive foundations"}'::jsonb),
  ('cyber-risk-and-threats', 'concept', 'Risk and Threat Thinking', 'Describe threats, vulnerabilities, impact, and likelihood without jumping to exploit activity.', 1, 15, '{"flagship":true,"safe_scope":"defensive foundations"}'::jsonb),
  ('cyber-controls-and-identity', 'capability', 'Controls and Identity', 'Apply least privilege, authentication, logging, and secure configuration concepts.', 2, 25, '{"flagship":true,"safe_scope":"defensive foundations"}'::jsonb),
  ('cyber-safe-lab-practice', 'practice', 'Safe Defensive Lab', 'Investigate a contained scenario and document observations, assumptions, and mitigations.', 2, 35, '{"flagship":true,"safe_scope":"sandboxed defensive practice"}'::jsonb),
  ('cyber-applied-project', 'project', 'Cybersecurity Risk Register', 'Create a small risk register and prioritised mitigation plan for a fictional organisation.', 3, 45, '{"flagship":true,"safe_scope":"defensive project"}'::jsonb),
  ('cyber-verified-capability', 'assessment', 'Explain a Defensive Recommendation', 'Explain a recommendation, its trade-offs, and how evidence would demonstrate improvement.', 4, 55, '{"flagship":true,"safe_scope":"defensive assessment"}'::jsonb)
) as n(node_key, node_type, title, description, level, order_index, metadata)
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.skill_id = s.id and v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict (skill_graph_version_id, node_key) do update set
  title = excluded.title,
  description = excluded.description,
  level = excluded.level,
  order_index = excluded.order_index,
  metadata = excluded.metadata;

insert into public.skill_graph_edges (skill_graph_version_id, from_node_id, to_node_id, edge_type, strength)
select v.id, from_node.id, to_node.id, 'prerequisite', 1.0
from public.skill_graph_versions v
join public.skills s on s.id = v.skill_id
join public.skill_graph_nodes from_node on from_node.skill_graph_version_id = v.id and from_node.node_key = 'cyber-systems-basics'
join public.skill_graph_nodes to_node on to_node.skill_graph_version_id = v.id and to_node.node_key = 'cyber-risk-and-threats'
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict do nothing;

insert into public.skill_graph_edges (skill_graph_version_id, from_node_id, to_node_id, edge_type, strength)
select v.id, from_node.id, to_node.id, 'prerequisite', 1.0
from public.skill_graph_versions v
join public.skills s on s.id = v.skill_id
join public.skill_graph_nodes from_node on from_node.skill_graph_version_id = v.id and from_node.node_key = 'cyber-risk-and-threats'
join public.skill_graph_nodes to_node on to_node.skill_graph_version_id = v.id and to_node.node_key = 'cyber-controls-and-identity'
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict do nothing;

insert into public.skill_graph_edges (skill_graph_version_id, from_node_id, to_node_id, edge_type, strength)
select v.id, from_node.id, to_node.id, 'prerequisite', 1.0
from public.skill_graph_versions v
join public.skills s on s.id = v.skill_id
join public.skill_graph_nodes from_node on from_node.skill_graph_version_id = v.id and from_node.node_key = 'cyber-controls-and-identity'
join public.skill_graph_nodes to_node on to_node.skill_graph_version_id = v.id and to_node.node_key = 'cyber-safe-lab-practice'
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict do nothing;

insert into public.skill_graph_edges (skill_graph_version_id, from_node_id, to_node_id, edge_type, strength)
select v.id, from_node.id, to_node.id, 'prerequisite', 1.0
from public.skill_graph_versions v
join public.skills s on s.id = v.skill_id
join public.skill_graph_nodes from_node on from_node.skill_graph_version_id = v.id and from_node.node_key = 'cyber-safe-lab-practice'
join public.skill_graph_nodes to_node on to_node.skill_graph_version_id = v.id and to_node.node_key = 'cyber-applied-project'
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict do nothing;

insert into public.skill_graph_edges (skill_graph_version_id, from_node_id, to_node_id, edge_type, strength)
select v.id, from_node.id, to_node.id, 'prerequisite', 1.0
from public.skill_graph_versions v
join public.skills s on s.id = v.skill_id
join public.skill_graph_nodes from_node on from_node.skill_graph_version_id = v.id and from_node.node_key = 'cyber-applied-project'
join public.skill_graph_nodes to_node on to_node.skill_graph_version_id = v.id and to_node.node_key = 'cyber-verified-capability'
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict do nothing;

insert into public.skill_sources (source_kind, title, publisher, canonical_url, version_label, trust_score, review_status)
values
  ('government', 'The NIST Cybersecurity Framework (CSF) 2.0', 'National Institute of Standards and Technology', 'https://www.nist.gov/cyberframework', '2.0', 0.99, 'approved'),
  ('government', 'Cyber Essentials', 'Cybersecurity and Infrastructure Security Agency', 'https://www.cisa.gov/resources-tools/resources/cyber-essentials', null, 0.98, 'approved'),
  ('professional_body', 'OWASP Top 10 Web Application Security Risks', 'OWASP Foundation', 'https://owasp.org/www-project-top-ten/', '2025', 0.97, 'approved')
on conflict (canonical_url, version_label) do update set
  title = excluded.title,
  publisher = excluded.publisher,
  trust_score = excluded.trust_score,
  review_status = excluded.review_status,
  retrieved_at = now();

insert into public.skill_graph_node_sources (skill_graph_node_id, source_id, claim, locator, evidence_strength)
select n.id, src.id, claims.claim, claims.locator, claims.evidence_strength
from public.skill_graph_nodes n
join public.skill_graph_versions v on v.id = n.skill_graph_version_id
join public.skills s on s.id = v.skill_id
cross join (values
  ('cyber-systems-basics', 'The CSF provides a common language for understanding, assessing, prioritising, and communicating cybersecurity risk.', 'NIST CSF 2.0 overview', 'https://www.nist.gov/cyberframework', 0.95::numeric),
  ('cyber-risk-and-threats', 'Cybersecurity fundamentals include identifying important assets, risks, and practical protective actions.', 'Cyber Essentials', 'https://www.cisa.gov/resources-tools/resources/cyber-essentials', 0.94::numeric),
  ('cyber-controls-and-identity', 'Secure design and identity controls are part of defensive application security practice.', 'OWASP Top 10', 'https://owasp.org/www-project-top-ten/', 0.92::numeric),
  ('cyber-applied-project', 'A risk register and prioritised mitigation plan are appropriate artefacts for communicating defensive priorities.', 'NIST CSF 2.0 overview', 'https://www.nist.gov/cyberframework', 0.90::numeric)
) as claims(node_key, claim, locator, url, evidence_strength)
join public.skill_sources src on src.canonical_url = claims.url and src.review_status = 'approved'
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.version_no = 1 and v.locale = 'en' and v.status = 'published'
  and n.node_key = claims.node_key
on conflict (skill_graph_node_id, source_id) do update set
  claim = excluded.claim,
  locator = excluded.locator,
  evidence_strength = excluded.evidence_strength;

insert into public.learning_objects (skill_graph_version_id, skill_graph_node_id, object_type, canonical_key, status)
select v.id, n.id, objects.object_type, objects.canonical_key, 'published'
from public.skill_graph_versions v
join public.skills s on s.id = v.skill_id
join public.skill_graph_nodes n on n.skill_graph_version_id = v.id
join (values
  ('cyber-systems-basics', 'lesson', 'cybersecurity-orientation'),
  ('cyber-safe-lab-practice', 'exercise', 'cybersecurity-safe-lab'),
  ('cyber-applied-project', 'project', 'cybersecurity-risk-register'),
  ('cyber-verified-capability', 'quiz', 'cybersecurity-foundations-check')
) as objects(node_key, object_type, canonical_key) on objects.node_key = n.node_key
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.version_no = 1 and v.locale = 'en' and v.status = 'published'
on conflict (skill_graph_version_id, canonical_key) do update set
  skill_graph_node_id = excluded.skill_graph_node_id,
  object_type = excluded.object_type,
  status = excluded.status;

insert into public.learning_object_versions (
  learning_object_id, version_no, locale, age_band, title, body, source_snapshot, evaluation, status, published_at
)
select lo.id, 1, 'en', '13_plus', content.title, content.body, content.source_snapshot, content.evaluation, 'published', now()
from public.learning_objects lo
join public.skill_graph_versions v on v.id = lo.skill_graph_version_id
join public.skills s on s.id = v.skill_id
join (values
  ('cybersecurity-orientation', 'Cybersecurity: how defenders think', '{"objective":"Build a safe mental model of systems, assets, trust boundaries, threats, and controls.","sections":[{"title":"Start with the system","body":"Name the people, devices, applications, and data involved before thinking about threats."},{"title":"Notice trust boundaries","body":"Ask where information or authority crosses from one part of the system to another."},{"title":"Choose a defensive question","body":"What could go wrong, what would matter most, and what practical control would reduce the risk?"}],"check":"Explain one asset, one trust boundary, and one defensive control in your own words."}'::jsonb, '[{"title":"The NIST Cybersecurity Framework (CSF) 2.0","url":"https://www.nist.gov/cyberframework"}]'::jsonb, '{"review_status":"published","safety_scope":"defensive foundations"}'::jsonb),
  ('cybersecurity-safe-lab', 'Safe lab: document a suspicious login scenario', '{"objective":"Practise structured defensive reasoning without probing or exploiting real systems.","scenario":"A fictional company sees repeated failed logins for one employee account. No real target, credentials, or external scanning is involved.","steps":["List the observations you have and the assumptions you must not make.","Identify the asset and plausible impact.","Suggest two defensive checks or controls a team could review.","Write what evidence would confirm whether the control improved the situation."],"submission_schema":{"observations":"string","risk_hypothesis":"string","defensive_checks":"array","evidence_to_collect":"array"}}'::jsonb, '[{"title":"Cyber Essentials","url":"https://www.cisa.gov/resources-tools/resources/cyber-essentials"}]'::jsonb, '{"review_status":"published","safety_scope":"sandboxed defensive practice"}'::jsonb),
  ('cybersecurity-risk-register', 'Project: build a cybersecurity risk register', '{"objective":"Create a small, defensible risk register for a fictional organisation.","brief":"Choose a fictional organisation, list five important assets, describe one risk for each, estimate likelihood and impact qualitatively, and propose a practical mitigation or monitoring action.","deliverables":["Asset and owner list","Five risk statements","Likelihood and impact rationale","Prioritised mitigation plan","Short reflection on uncertainty and trade-offs"],"review_criteria":["Risk statements are specific and defensive","Prioritisation is explained","Mitigations are practical and proportionate","The learner distinguishes facts, assumptions, and unknowns"]}'::jsonb, '[{"title":"The NIST Cybersecurity Framework (CSF) 2.0","url":"https://www.nist.gov/cyberframework"},{"title":"Cyber Essentials","url":"https://www.cisa.gov/resources-tools/resources/cyber-essentials"}]'::jsonb, '{"review_status":"published","safety_scope":"defensive project"}'::jsonb),
  ('cybersecurity-foundations-check', 'Cybersecurity foundations check', '{"objective":"Explain core defensive concepts and justify a safe next action.","questions":["What is an asset in a cybersecurity context?","Why should a risk statement separate likelihood from impact?","Give one example of a preventive control and one example of evidence that it is working."],"response_mode":"short_explanation","evidence_kind":"quiz"}'::jsonb, '[{"title":"The NIST Cybersecurity Framework (CSF) 2.0","url":"https://www.nist.gov/cyberframework"},{"title":"OWASP Top 10 Web Application Security Risks","url":"https://owasp.org/www-project-top-ten/"}]'::jsonb, '{"review_status":"published","safety_scope":"defensive assessment"}'::jsonb)
) as content(canonical_key, title, body, source_snapshot, evaluation) on content.canonical_key = lo.canonical_key
where s.canonical_slug = 'curated:cybersecurity-foundation'
  and v.version_no = 1 and v.locale = 'en'
on conflict (learning_object_id, version_no, locale, age_band) do update set
  title = excluded.title,
  body = excluded.body,
  source_snapshot = excluded.source_snapshot,
  evaluation = excluded.evaluation,
  status = excluded.status,
  published_at = now();

comment on table public.learning_objects is 'Published learning objects include a Cybersecurity flagship slice with source snapshots and safe defensive scope.';
