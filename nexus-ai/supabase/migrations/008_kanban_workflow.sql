-- DEV 3 · Workflow & Automation
-- Adds the task metadata required by Kanban cards and keeps updated_at reliable.

alter table public.tasks
  add column if not exists required_skills text[] not null default '{}';

create index if not exists tasks_project_id_status_idx
  on public.tasks (project_id, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
