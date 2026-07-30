create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.documents (
  id uuid primary key default extensions.gen_random_uuid(),
  project_id text not null,
  source_id uuid not null,
  filename text not null,
  chunk_index integer not null check (chunk_index >= 0),
  content text not null check (length(content) > 0),
  embedding extensions.vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_id, chunk_index)
);

create index if not exists documents_project_id_idx
  on public.documents (project_id);

create index if not exists documents_embedding_hnsw_idx
  on public.documents using hnsw (embedding vector_cosine_ops);

alter table public.documents enable row level security;

create or replace function public.match_documents(
  query_embedding extensions.vector(1536),
  filter_project_id text,
  match_threshold float default 0.35,
  match_count int default 5
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
set search_path = ''
as $$
  select
    documents.id,
    documents.filename,
    documents.chunk_index,
    documents.content,
    1 - (
      documents.embedding OPERATOR(extensions.<=>) query_embedding
    ) as similarity
  from public.documents
  where documents.project_id = filter_project_id
    and 1 - (
      documents.embedding OPERATOR(extensions.<=>) query_embedding
    ) >= match_threshold
  order by documents.embedding OPERATOR(extensions.<=>) query_embedding
  limit least(match_count, 20);
$$;

revoke all on function public.match_documents(
  extensions.vector,
  text,
  float,
  int
) from public;
grant execute on function public.match_documents(
  extensions.vector,
  text,
  float,
  int
) to service_role;

-- Yêu cầu PostgREST nạp lại bảng và RPC vừa tạo ngay sau migration.
notify pgrst, 'reload schema';
