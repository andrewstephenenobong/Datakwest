-- First governed RAG corpus: approved primary cybersecurity sources only.
-- Embeddings remain pending until the service-role embedding worker processes them.

insert into public.source_documents (
  skill_source_id, source_version, title, publisher, canonical_url,
  locale, content_hash, publication_status, extracted_at, metadata
)
select
  s.id,
  1,
  s.title,
  s.publisher,
  s.canonical_url,
  'en',
  md5(s.canonical_url || ':v1:en'),
  'approved',
  now(),
  jsonb_build_object('corpus', 'cybersecurity-foundations', 'ingestion_method', 'curated_primary_source_excerpt', 'review_status', s.review_status)
from public.skill_sources s
where s.canonical_url in (
  'https://www.nist.gov/cyberframework',
  'https://www.cisa.gov/resources-tools/resources/cyber-essentials',
  'https://owasp.org/www-project-top-ten/'
)
  and s.review_status = 'approved'
on conflict (skill_source_id, source_version) do update set
  title = excluded.title,
  publisher = excluded.publisher,
  canonical_url = excluded.canonical_url,
  content_hash = excluded.content_hash,
  publication_status = excluded.publication_status,
  extracted_at = excluded.extracted_at,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.source_chunks (
  source_document_id, chunk_index, content, content_hash, token_count,
  locale, embedding_status, metadata
)
select d.id, c.chunk_index, c.content, md5(c.content), c.token_count,
  'en', 'pending', jsonb_build_object('corpus', 'cybersecurity-foundations', 'review_status', 'approved')
from public.source_documents d
join (values
  ('https://www.nist.gov/cyberframework', 0, 'The NIST Cybersecurity Framework helps organizations better understand and improve their management of cybersecurity risk.', 17),
  ('https://www.nist.gov/cyberframework', 1, 'NIST CSF 2.0 is intended for industry, government, and organizations to reduce cybersecurity risks. It provides a common language for understanding, assessing, prioritising, and communicating cybersecurity risk.', 29),
  ('https://www.cisa.gov/resources-tools/resources/cyber-essentials', 0, 'CISA Cyber Essentials is a guide for leaders of small businesses and small and local government agencies to develop an actionable understanding of where to start implementing organizational cybersecurity practices.', 32),
  ('https://www.cisa.gov/resources-tools/resources/cyber-essentials', 1, 'CISA describes a culture of cyber readiness through six essential elements: yourself, your staff, your systems, your surroundings, your data, and your crisis response.', 24),
  ('https://owasp.org/www-project-top-ten/', 0, 'The OWASP Top 10 is a standard awareness document for developers about the most critical web application security risks and represents a broad consensus about those risks.', 27),
  ('https://owasp.org/www-project-top-ten/', 1, 'The OWASP project identifies the current released version as OWASP Top 10:2025 and provides previous versions and translations through its official project pages.', 24)
) as c(url, chunk_index, content, token_count) on c.url = d.canonical_url
on conflict (source_document_id, chunk_index) do update set
  content = excluded.content,
  content_hash = excluded.content_hash,
  token_count = excluded.token_count,
  embedding_status = case when public.source_chunks.content_hash = excluded.content_hash then public.source_chunks.embedding_status else 'pending' end,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.source_chunk_graph_nodes (source_chunk_id, skill_graph_node_id, claim)
select c.id, n.id,
  case
    when d.canonical_url = 'https://www.nist.gov/cyberframework' and n.node_key = 'cyber-systems-basics' then 'The NIST CSF provides a common language for managing cybersecurity risk.'
    when d.canonical_url = 'https://www.cisa.gov/resources-tools/resources/cyber-essentials' and n.node_key = 'cyber-risk-and-threats' then 'CISA Cyber Essentials introduces practical cyber-readiness actions for leaders and teams.'
    when d.canonical_url = 'https://www.cisa.gov/resources-tools/resources/cyber-essentials' and n.node_key = 'cyber-controls-and-identity' then 'CISA emphasizes systems, surroundings, data protection, and crisis response as defensive practice areas.'
    when d.canonical_url = 'https://owasp.org/www-project-top-ten/' and n.node_key = 'cyber-controls-and-identity' then 'OWASP Top 10 is an application-security awareness reference for critical web risks.'
    else 'Approved primary-source context for Cybersecurity foundations.'
  end
from public.source_chunks c
join public.source_documents d on d.id = c.source_document_id
join public.skill_graph_node_sources existing_source on existing_source.source_id = d.skill_source_id
join public.skill_graph_nodes n on n.id = existing_source.skill_graph_node_id
where d.publication_status = 'approved'
  and c.embedding_status = 'pending'
  and n.node_key in ('cyber-systems-basics', 'cyber-risk-and-threats', 'cyber-controls-and-identity', 'cyber-applied-project')
on conflict (source_chunk_id, skill_graph_node_id) do update set claim = excluded.claim;

comment on table public.source_chunks is 'Cybersecurity corpus chunks are approved excerpts/summaries from NIST, CISA, and OWASP and remain pending until embedded by the service-role worker.';
