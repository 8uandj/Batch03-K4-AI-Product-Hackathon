create extension if not exists vector;
create extension if not exists pgcrypto;

alter table public.documents
  add column if not exists project_id uuid,
  add column if not exists source_id uuid not null default gen_random_uuid(),
  add column if not exists filename text not null default 'untitled',
  add column if not exists chunk_index integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_chunk_index_nonnegative'
      and conrelid = 'public.documents'::regclass
  ) then
    alter table public.documents
      add constraint documents_chunk_index_nonnegative
      check (chunk_index >= 0)
      not valid;
  end if;
end $$;

alter table public.documents
  validate constraint documents_chunk_index_nonnegative;

create unique index if not exists documents_source_chunk_unique_idx
  on public.documents (source_id, chunk_index);

create index if not exists documents_project_id_idx
  on public.documents (project_id);

create index if not exists documents_embedding_hnsw_idx
  on public.documents using hnsw (embedding vector_cosine_ops);

alter table public.documents enable row level security;

drop function if exists public.match_documents(vector(1536), float, integer);

create or replace function public.match_documents(
  query_embedding vector(1536),
  filter_project_id uuid,
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

grant execute on function public.match_documents(
  vector(1536),
  uuid,
  float,
  integer
) to service_role;

notify pgrst, 'reload schema';
