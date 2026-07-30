create extension if not exists vector;
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default uuid_generate_v4(),
  name text,
  skills text[] not null default '{}',
  eq_answers jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id text not null default 'global',
  source_id uuid not null default gen_random_uuid(),
  filename text not null default 'untitled',
  chunk_index integer not null default 0 check (chunk_index >= 0),
  content text not null check (length(content) > 0),
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  unique (source_id, chunk_index)
);

create or replace function public.match_documents(
  query_embedding vector(1536),
  filter_project_id text,
  match_threshold float default 0.35,
  match_count integer default 5
)
returns table (
  id uuid,
  filename text,
  chunk_index integer,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    documents.id,
    documents.filename,
    documents.chunk_index,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from public.documents
  where documents.project_id = filter_project_id
    and 1 - (documents.embedding <=> query_embedding) >= match_threshold
  order by documents.embedding <=> query_embedding
  limit least(match_count, 20);
$$;

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  status text not null default 'todo'
    check (status in ('todo', 'doing', 'done')),
  assignee_id uuid not null references public.users(id),
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create index documents_project_id_idx on public.documents (project_id);

create index documents_embedding_hnsw_idx
  on public.documents using hnsw (embedding vector_cosine_ops);

create index tasks_assignee_id_idx on public.tasks (assignee_id);
