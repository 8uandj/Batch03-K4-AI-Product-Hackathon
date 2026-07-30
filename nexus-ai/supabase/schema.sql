create extension if not exists vector;
create extension if not exists "uuid-ossp";

create table public.users (
  id uuid primary key default uuid_generate_v4(),
  name text,
  skills text[] not null default '{}',
  eq_answers jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.documents (
  id uuid primary key default uuid_generate_v4(),
  content text not null,
  embedding vector(1536) not null,
  created_at timestamp with time zone not null default now()
);

create or replace function public.match_documents(
  query_embedding vector(1536),
  match_threshold float,
  match_count integer
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql
stable
as $$
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from public.documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding
  limit match_count;
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

create index documents_embedding_hnsw_idx
  on public.documents using hnsw (embedding vector_cosine_ops);

create index tasks_assignee_id_idx on public.tasks (assignee_id);
