-- Prevent cross-project references even when a client bypasses the API layer.

create or replace function public.validate_project_task_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.task_id is not null
    and not exists (
      select 1 from public.tasks
      where id = new.task_id and project_id = new.project_id
    )
  then
    raise exception 'Task does not belong to the event project';
  end if;
  return new;
end;
$$;

drop trigger if exists task_activity_project_guard on public.task_activity_events;
create trigger task_activity_project_guard
  before insert or update on public.task_activity_events
  for each row execute function public.validate_project_task_reference();

drop trigger if exists assignment_decision_project_guard on public.assignment_decisions;
create trigger assignment_decision_project_guard
  before insert or update on public.assignment_decisions
  for each row execute function public.validate_project_task_reference();

create or replace function public.validate_project_member_references()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.user_id is not null
    and not exists (
      select 1 from public.project_members
      where project_id = new.project_id and user_id = new.user_id
    )
  then
    raise exception 'User does not belong to the activity project';
  end if;
  return new;
end;
$$;

drop trigger if exists member_activity_project_guard on public.member_activity_daily;
create trigger member_activity_project_guard
  before insert or update on public.member_activity_daily
  for each row execute function public.validate_project_member_references();

create or replace function public.validate_task_source_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.source_task_id is not null
    and not exists (
      select 1 from public.tasks
      where id = new.source_task_id and project_id = new.project_id
    )
  then
    raise exception 'Source task does not belong to the task project';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_source_project_guard on public.tasks;
create trigger tasks_source_project_guard
  before insert or update of source_task_id, project_id on public.tasks
  for each row execute function public.validate_task_source_reference();

notify pgrst, 'reload schema';
