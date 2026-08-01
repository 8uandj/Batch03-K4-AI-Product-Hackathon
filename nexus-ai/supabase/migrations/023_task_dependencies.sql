-- Explicit single-task dependency for blocker-aware deadline monitoring.
alter table public.tasks
  add column if not exists blocked_by_task_id uuid references public.tasks(id) on delete set null;

alter table public.tasks
  drop constraint if exists tasks_not_self_blocked_check;
alter table public.tasks
  add constraint tasks_not_self_blocked_check
  check (blocked_by_task_id is null or blocked_by_task_id <> id);

create or replace function public.validate_task_dependency_project()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.blocked_by_task_id is not null and not exists (
    select 1 from public.tasks dependency
    where dependency.id = new.blocked_by_task_id
      and dependency.project_id = new.project_id
  ) then
    raise exception 'Dependency task must belong to the same project'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_validate_dependency_project on public.tasks;
create trigger tasks_validate_dependency_project
  before insert or update of blocked_by_task_id, project_id on public.tasks
  for each row
  execute function public.validate_task_dependency_project();

notify pgrst, 'reload schema';
