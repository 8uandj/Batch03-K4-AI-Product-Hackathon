-- Keep rework relationships truthful even when a caller bypasses the API.
create or replace function public.validate_rework_source_reference()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  source_status text;
begin
  if new.source_task_id is null then
    return new;
  end if;

  if new.source_type not in ('feedback_change', 'bug_fix') or new.origin <> 'rework' then
    raise exception 'Source task is only valid for feedback or bug-fix rework' using errcode = '23514';
  end if;

  select status into source_status
  from public.tasks
  where id = new.source_task_id and project_id = new.project_id;
  if source_status is distinct from 'done' then
    raise exception 'Source task must be completed before creating rework' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists tasks_rework_source_guard on public.tasks;
create constraint trigger tasks_rework_source_guard
after insert or update of source_task_id, source_type, origin, project_id on public.tasks
deferrable initially immediate
for each row execute function public.validate_rework_source_reference();

notify pgrst, 'reload schema';
