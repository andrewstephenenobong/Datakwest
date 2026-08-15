-- Return at most one grounded row per source chunk even when it maps to multiple graph nodes.
CREATE OR REPLACE FUNCTION public.retrieve_knowledge_chunks(
  p_query_embedding extensions.vector(768),
  p_skill_graph_version_id uuid default null,
  p_locale text default 'en',
  p_limit integer default 6
)
RETURNS TABLE (
  chunk_id uuid,
  source_document_id uuid,
  title text,
  publisher text,
  canonical_url text,
  content text,
  claim text,
  similarity real
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  with bounded_limit as (
    select least(greatest(coalesce(p_limit, 6), 1), 12) as value
  ),
  ranked as (
    select
      c.id as chunk_id,
      d.id as source_document_id,
      d.title,
      d.publisher,
      d.canonical_url,
      c.content,
      coalesce(m.claim, '') as claim,
      (1 - (c.embedding <=> p_query_embedding))::real as similarity,
      row_number() over (
        partition by c.id
        order by (c.embedding <=> p_query_embedding), coalesce(m.claim, '')
      ) as row_rank
    from public.source_chunks c
    join public.source_documents d on d.id = c.source_document_id
    left join public.source_chunk_graph_nodes m on m.source_chunk_id = c.id
    left join public.skill_graph_nodes n on n.id = m.skill_graph_node_id
    cross join bounded_limit b
    where c.embedding_status = 'ready'
      and d.publication_status = 'approved'
      and c.locale = coalesce(nullif(p_locale, ''), 'en')
      and c.embedding is not null
      and (p_skill_graph_version_id is null or n.skill_graph_version_id = p_skill_graph_version_id)
  )
  select chunk_id, source_document_id, title, publisher, canonical_url, content, claim, similarity
  from ranked
  where row_rank = 1
  order by similarity desc
  limit (select value from bounded_limit);
$$;

revoke all on function public.retrieve_knowledge_chunks(extensions.vector(768), uuid, text, integer) from public;
grant execute on function public.retrieve_knowledge_chunks(extensions.vector(768), uuid, text, integer) to authenticated;
