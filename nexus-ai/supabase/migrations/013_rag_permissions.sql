-- Create (or recreate) match_documents and grant execute to all roles.
-- Safe to run even if the function already exists.

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

-- Grant to all roles so the function works regardless of which key is used.
grant execute on function public.match_documents(
  vector,
  uuid,
  double precision,
  integer
) to service_role, authenticated, anon;

notify pgrst, 'reload schema';
