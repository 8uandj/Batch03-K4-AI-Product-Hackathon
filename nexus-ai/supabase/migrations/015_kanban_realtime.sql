-- Keep every open Kanban board in sync when a project member changes a task.
-- Realtime still applies the SELECT RLS policy, so only project members receive
-- rows belonging to projects they are allowed to read.

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'tasks'
  ) then
    alter publication supabase_realtime add table public.tasks;
  end if;
end
$$;

notify pgrst, 'reload schema';
