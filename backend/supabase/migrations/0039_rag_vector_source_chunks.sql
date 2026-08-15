-- RAG foundation. This migration intentionally requires explicit production approval
-- because it installs pgvector and adds vector-indexed source content.

create extension if not exists vector with schema extensions;

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  skill_source_id uuid not null references public.skill_sources(id) on delete restrict,
  source_version integer not null default 1 check (source_version > 0),
  title text not null,
  publisher text not null default '',
  canonical_url text not null,
  locale text not null default 'en',
  content_hash text not null,
  publication_status text not null default 'approved' check (publication_status in ('draft', 'approved', 'withdrawn')),
  extracted_at timestamptz,
  withdrawn_at timestamptz,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(skill_source_id, source_version),
  unique(canonical_url, source_version)
);

create table if not exists public.source_chunks (
  id uuid primary key default gen_random_uuid(),
  source_document_id uuid not null references public.source_documents(id) on delete cascade,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(trim(content)) between 20 and 20000),
  content_hash text not null,
  token_count integer check (token_count is null or token_count > 0),
  locale text not null default 'en',
  embedding extensions.vector(768),
  embedding_model text,
  embedding_version integer,
  embedding_status text not null default 'pending' check (embedding_status in ('pending', 'processing', 'ready', 'failed', 'withdrawn')),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(source_document_id, chunk_index),
  unique(source_document_id, content_hash)
);

create table if not exists public.source_chunk_graph_nodes (
  source_chunk_id uuid not null references public.source_chunks(id) on delete cascade,
  skill_graph_node_id uuid not null references public.skill_graph_nodes(id) on delete cascade,
  claim text not null default '',
  created_at timestamptz not null default now(),
  primary key(source_chunk_id, skill_graph_node_id)
);

create index if not exists source_documents_approved_source_idx
  on public.source_documents(skill_source_id, locale, publication_status);
create index if not exists source_chunks_ready_locale_idx
  on public.source_chunks(locale, embedding_status, source_document_id);
create index if not exists source_chunk_graph_nodes_node_idx
  on public.source_chunk_graph_nodes(skill_graph_node_id, source_chunk_id);

-- HNSW is preferred for interactive retrieval. The index remains empty until the
-- approved ingestion/embedding pipeline writes ready embeddings.
create index if not exists source_chunks_embedding_hnsw_idx
  on public.source_chunks using hnsw (embedding extensions.vector_ip_ops)
  where embedding_status = 'ready';

alter table public.source_documents enable row level security;
alter table public.source_chunks enable row level security;
alter table public.source_chunk_graph_nodes enable row level security;

create policy "Authenticated users can view approved source documents"
  on public.source_documents for select to authenticated
  using (publication_status = 'approved');
create policy "Authenticated users can view ready source chunks"
  on public.source_chunks for select to authenticated
  using (embedding_status = 'ready');
create policy "Authenticated users can view published chunk mappings"
  on public.source_chunk_graph_nodes for select to authenticated
  using (exists (
    select 1 from public.source_chunks c
    join public.source_documents d on d.id = c.source_document_id
    where c.id = source_chunk_graph_nodes.source_chunk_id
      and c.embedding_status = 'ready'
      and d.publication_status = 'approved'
  ));

create or replace function public.retrieve_knowledge_chunks(
  p_query_embedding extensions.vector(768),
  p_skill_graph_version_id uuid default null,
  p_locale text default 'en',
  p_limit integer default 6
)
returns table (
  chunk_id uuid,
  source_document_id uuid,
  title text,
  publisher text,
  canonical_url text,
  content text,
  claim text,
  similarity real
)
language sql
security definer
set search_path = public, extensions
as $$
  with bounded_limit as (
    select least(greatest(coalesce(p_limit, 6), 1), 12) as value
  )
  select
    c.id,
    d.id,
    d.title,
    d.publisher,
    d.canonical_url,
    c.content,
    coalesce(m.claim, ''),
    (1 - (c.embedding <=> p_query_embedding))::real
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
  order by c.embedding <=> p_query_embedding
  limit (select value from bounded_limit);
$$;

revoke all on function public.retrieve_knowledge_chunks(extensions.vector(768), uuid, text, integer) from public;
grant execute on function public.retrieve_knowledge_chunks(extensions.vector(768), uuid, text, integer) to authenticated;

comment on table public.source_documents is 'Versioned, approved source documents that may be used for grounded Datakwest instruction.';
comment on table public.source_chunks is 'Governed source chunks with versioned embeddings; arbitrary learner text is never inserted here.';
comment on function public.retrieve_knowledge_chunks(extensions.vector(768), uuid, text, integer) is 'Bounded semantic retrieval over approved, embedded source chunks with locale and skill-graph filters.';
