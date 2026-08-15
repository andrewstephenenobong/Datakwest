-- DataKwest Universal Skill Intelligence Foundation: skill graph and provenance.
-- This migration extends the existing MVP skills table instead of replacing it.
-- All authoring and publication writes remain server/admin controlled.

create table if not exists public.skill_domains (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.skills
  add column if not exists domain_id uuid references public.skill_domains(id) on delete set null,
  add column if not exists canonical_slug text,
  add column if not exists discovery_source text not null default 'curated',
  add column if not exists approved_by uuid references auth.users(id) on delete set null,
  add column if not exists approved_at timestamptz;

update public.skills
set canonical_slug = coalesce(canonical_slug, 'legacy:' || slug || ':' || id::text)
where canonical_slug is null;

create unique index if not exists skills_canonical_slug_key
  on public.skills(canonical_slug)
  where canonical_slug is not null;

create table if not exists public.skill_graph_versions (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  locale text not null default 'en',
  status text not null default 'draft' check (status in ('draft', 'review', 'pilot', 'published', 'retired')),
  target_age_min smallint check (target_age_min is null or target_age_min >= 0),
  target_age_max smallint check (target_age_max is null or target_age_max >= target_age_min),
  estimated_hours_min numeric(8,2) check (estimated_hours_min is null or estimated_hours_min >= 0),
  estimated_hours_max numeric(8,2) check (estimated_hours_max is null or estimated_hours_max >= estimated_hours_min),
  methodology text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(skill_id, version_no, locale)
);

create table if not exists public.skill_graph_nodes (
  id uuid primary key default gen_random_uuid(),
  skill_graph_version_id uuid not null references public.skill_graph_versions(id) on delete cascade,
  node_key text not null,
  node_type text not null check (node_type in ('concept', 'capability', 'prerequisite', 'practice', 'project', 'assessment', 'career_outcome')),
  title text not null,
  description text not null default '',
  level smallint not null default 1 check (level between 1 and 10),
  order_index integer not null default 0,
  mastery_threshold numeric(5,4) not null default 0.8000 check (mastery_threshold between 0 and 1),
  legacy_concept_node_id uuid references public.concept_nodes(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  unique(skill_graph_version_id, node_key)
);

create table if not exists public.skill_graph_edges (
  id uuid primary key default gen_random_uuid(),
  skill_graph_version_id uuid not null references public.skill_graph_versions(id) on delete cascade,
  from_node_id uuid not null references public.skill_graph_nodes(id) on delete cascade,
  to_node_id uuid not null references public.skill_graph_nodes(id) on delete cascade,
  edge_type text not null check (edge_type in ('prerequisite', 'builds_on', 'related', 'alternative', 'assessed_by')),
  strength numeric(5,4) not null default 1.0000 check (strength between 0 and 1),
  created_at timestamptz not null default now(),
  check (from_node_id <> to_node_id),
  unique(skill_graph_version_id, from_node_id, to_node_id, edge_type)
);

create table if not exists public.skill_sources (
  id uuid primary key default gen_random_uuid(),
  source_kind text not null check (source_kind in ('official_documentation', 'standard', 'textbook', 'university', 'professional_body', 'government', 'expert_review', 'open_source', 'web')),
  title text not null,
  publisher text,
  canonical_url text not null,
  version_label text,
  published_on date,
  retrieved_at timestamptz not null default now(),
  license text,
  checksum text,
  trust_score numeric(5,4) check (trust_score is null or trust_score between 0 and 1),
  review_status text not null default 'draft' check (review_status in ('draft', 'review', 'approved', 'rejected', 'retired')),
  reviewed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(canonical_url, version_label)
);

create table if not exists public.skill_graph_node_sources (
  skill_graph_node_id uuid not null references public.skill_graph_nodes(id) on delete cascade,
  source_id uuid not null references public.skill_sources(id) on delete cascade,
  claim text not null default '',
  locator text not null default '',
  evidence_strength numeric(5,4) check (evidence_strength is null or evidence_strength between 0 and 1),
  primary key(skill_graph_node_id, source_id)
);

create table if not exists public.learning_objects (
  id uuid primary key default gen_random_uuid(),
  skill_graph_version_id uuid not null references public.skill_graph_versions(id) on delete cascade,
  skill_graph_node_id uuid not null references public.skill_graph_nodes(id) on delete restrict,
  object_type text not null check (object_type in ('lesson', 'example', 'exercise', 'quiz', 'project', 'simulation', 'image', 'video', 'audio', 'reflection', 'interview')),
  canonical_key text not null,
  status text not null default 'draft' check (status in ('draft', 'review', 'pilot', 'published', 'deprecated')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(skill_graph_version_id, canonical_key)
);

create table if not exists public.learning_object_versions (
  id uuid primary key default gen_random_uuid(),
  learning_object_id uuid not null references public.learning_objects(id) on delete cascade,
  version_no integer not null check (version_no > 0),
  locale text not null default 'en',
  age_band text not null default '13_plus',
  title text not null,
  body jsonb not null default '{}'::jsonb check (jsonb_typeof(body) = 'object'),
  answer_key jsonb,
  rubric jsonb,
  accessibility jsonb not null default '{}'::jsonb check (jsonb_typeof(accessibility) = 'object'),
  source_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(source_snapshot) = 'array'),
  evaluation jsonb not null default '{}'::jsonb check (jsonb_typeof(evaluation) = 'object'),
  status text not null default 'draft' check (status in ('draft', 'review', 'pilot', 'published', 'deprecated')),
  created_by uuid references auth.users(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique(learning_object_id, version_no, locale, age_band)
);

create index if not exists skill_graph_versions_published_idx
  on public.skill_graph_versions(skill_id, locale, version_no desc)
  where status = 'published';
create index if not exists skill_graph_nodes_version_order_idx
  on public.skill_graph_nodes(skill_graph_version_id, order_index);
create index if not exists skill_graph_edges_to_idx
  on public.skill_graph_edges(skill_graph_version_id, to_node_id);
create index if not exists skill_graph_sources_review_idx
  on public.skill_sources(review_status, retrieved_at desc);
create index if not exists learning_object_versions_published_idx
  on public.learning_object_versions(learning_object_id, locale, age_band, version_no desc)
  where status = 'published';

alter table public.skill_domains enable row level security;
alter table public.skill_graph_versions enable row level security;
alter table public.skill_graph_nodes enable row level security;
alter table public.skill_graph_edges enable row level security;
alter table public.skill_sources enable row level security;
alter table public.skill_graph_node_sources enable row level security;
alter table public.learning_objects enable row level security;
alter table public.learning_object_versions enable row level security;

create policy "Authenticated users can view published skill graph versions"
  on public.skill_graph_versions for select to authenticated
  using (status = 'published');
create policy "Authenticated users can view published skill graph nodes"
  on public.skill_graph_nodes for select to authenticated
  using (exists (
    select 1 from public.skill_graph_versions v
    where v.id = skill_graph_nodes.skill_graph_version_id and v.status = 'published'
  ));
create policy "Authenticated users can view published skill graph edges"
  on public.skill_graph_edges for select to authenticated
  using (exists (
    select 1 from public.skill_graph_versions v
    where v.id = skill_graph_edges.skill_graph_version_id and v.status = 'published'
  ));
create policy "Authenticated users can view approved skill sources"
  on public.skill_sources for select to authenticated
  using (review_status = 'approved');
create policy "Authenticated users can view published learning objects"
  on public.learning_objects for select to authenticated
  using (status = 'published');
create policy "Authenticated users can view published learning object versions"
  on public.learning_object_versions for select to authenticated
  using (status = 'published');

comment on table public.skill_graph_versions is 'Immutable, versioned universal skill graph releases for curated and exploratory paths.';
comment on table public.skill_graph_nodes is 'Versioned concepts, capabilities, practices, projects, assessments, and outcomes.';
comment on table public.skill_sources is 'Source provenance registry for grounded curriculum and generated learning objects.';
comment on table public.learning_object_versions is 'Localised and age-banded learning content requiring evaluation before publication.';
