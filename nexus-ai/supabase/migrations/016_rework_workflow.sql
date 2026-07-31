-- PM-only Rework workflow for Kanban tasks.
-- A task may enter Rework only from Done. Members can read Rework tasks but
-- cannot create, move, update, or delete them.

alter table public.tasks
  drop constraint if exists tasks_status_check;

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('todo', 'doing', 'rework', 'done'));

create or replace function public.validate_task_rework_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.status is distinct from new.status
    and new.status = 'rework'
    and old.status <> 'done'
  then
    raise exception 'Task can only move from done to rework'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_validate_rework_transition on public.tasks;
create trigger tasks_validate_rework_transition
  before update of status on public.tasks
  for each row
  execute function public.validate_task_rework_transition();

drop policy if exists "Project members can manage tasks" on public.tasks;
drop policy if exists "Project members can read tasks" on public.tasks;
drop policy if exists "Project members can insert regular tasks" on public.tasks;
drop policy if exists "Project PM can insert tasks" on public.tasks;
drop policy if exists "Project members can update regular tasks" on public.tasks;
drop policy if exists "Project PM can update tasks" on public.tasks;
drop policy if exists "Project members can delete regular tasks" on public.tasks;
drop policy if exists "Project PM can delete tasks" on public.tasks;

create policy "Project members can read tasks"
  on public.tasks for select
  to authenticated
  using (project_id is null or public.is_project_member(project_id));

create policy "Project members can insert regular tasks"
  on public.tasks for insert
  to authenticated
  with check (
    (project_id is null or public.is_project_member(project_id))
    and status <> 'rework'
  );

create policy "Project PM can insert tasks"
  on public.tasks for insert
  to authenticated
  with check (project_id is not null and public.is_project_pm(project_id));

create policy "Project members can update regular tasks"
  on public.tasks for update
  to authenticated
  using (
    (project_id is null or public.is_project_member(project_id))
    and status <> 'rework'
  )
  with check (
    (project_id is null or public.is_project_member(project_id))
    and status <> 'rework'
  );

create policy "Project PM can update tasks"
  on public.tasks for update
  to authenticated
  using (project_id is not null and public.is_project_pm(project_id))
  with check (project_id is not null and public.is_project_pm(project_id));

create policy "Project members can delete regular tasks"
  on public.tasks for delete
  to authenticated
  using (
    (project_id is null or public.is_project_member(project_id))
    and status <> 'rework'
  );

create policy "Project PM can delete tasks"
  on public.tasks for delete
  to authenticated
  using (project_id is not null and public.is_project_pm(project_id));

notify pgrst, 'reload schema';
