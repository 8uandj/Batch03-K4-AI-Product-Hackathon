-- Project-scoped risk event writer with a short deduplication window.
-- Conflict signals may be emitted by a member who opted in; workload/other
-- signals remain PM-only.
create or replace function public.record_risk_event(
  target_project_id uuid,
  target_user_id uuid,
  target_task_id uuid default null,
  event_type text default 'overload',
  event_severity text default 'medium',
  event_summary text default '',
  event_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  created_id uuid;
begin
  if auth.uid() is null or not public.is_project_member(target_project_id) then
    raise exception 'Project membership required' using errcode = '42501';
  end if;
  if target_user_id is not null and not exists (
    select 1 from public.project_members
    where project_id = target_project_id and user_id = target_user_id
  ) then
    raise exception 'Risk event user must belong to project' using errcode = '23514';
  end if;
  if event_type not in ('overdue', 'overload', 'conflict', 'burnout_signal') then
    raise exception 'Invalid risk event type' using errcode = '23514';
  end if;
  if event_type <> 'conflict' and not public.is_project_pm(target_project_id) then
    raise exception 'Only project PM can record this risk event' using errcode = '42501';
  end if;
  if event_severity not in ('low', 'medium', 'high') then
    raise exception 'Invalid risk event severity' using errcode = '23514';
  end if;
  if nullif(trim(event_summary), '') is null then
    raise exception 'Risk event summary is required' using errcode = '23514';
  end if;

  select id into existing_id
  from public.risk_events
  where project_id = target_project_id
    and user_id is not distinct from target_user_id
    and task_id is not distinct from target_task_id
    and type = event_type
    and created_at >= now() - interval '24 hours'
  order by created_at desc
  limit 1;
  if existing_id is not null then return existing_id; end if;

  insert into public.risk_events (project_id, user_id, task_id, type, severity, summary, metadata)
  values (target_project_id, target_user_id, target_task_id, event_type,
    event_severity, left(trim(event_summary), 1000), coalesce(event_metadata, '{}'::jsonb))
  returning id into created_id;
  return created_id;
end;
$$;

revoke all on function public.record_risk_event(uuid, uuid, uuid, text, text, text, jsonb) from public;
grant execute on function public.record_risk_event(uuid, uuid, uuid, text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
