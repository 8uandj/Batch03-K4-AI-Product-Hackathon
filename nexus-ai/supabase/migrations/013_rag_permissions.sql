-- Grant execute permissions on match_documents to authenticated and anon roles
-- so that it can be called using the publishable key.
grant execute on function public.match_documents(
  vector,
  uuid,
  double precision,
  integer
) to authenticated, anon;

notify pgrst, 'reload schema';
