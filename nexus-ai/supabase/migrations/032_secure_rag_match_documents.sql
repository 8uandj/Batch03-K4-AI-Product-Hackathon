-- RAG retrieval must enforce project membership at the database boundary.
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
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_service_role boolean := coalesce(auth.jwt()->>'role', '') = 'service_role';
begin
  if not is_service_role then
    if auth.uid() is null then
      raise exception 'Authentication required' using errcode = '42501';
    end if;
    if not public.is_project_member(filter_project_id) then
      raise exception 'Project membership required' using errcode = '42501';
    end if;
  end if;

  return query
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
end;
$$;

revoke all on function public.match_documents(vector, uuid, double precision, integer) from public;
grant execute on function public.match_documents(vector, uuid, double precision, integer) to authenticated;
grant execute on function public.match_documents(vector, uuid, double precision, integer) to service_role;

notify pgrst, 'reload schema';
