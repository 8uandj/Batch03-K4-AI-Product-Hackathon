-- Let the affected member acknowledge a force-assign follow-up atomically.
create or replace function public.respond_assignment_followup(
  target_project_id uuid,
  target_task_id uuid,
  response_note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  followup_id uuid;
  followup_member_id uuid;
  caller_is_pm boolean;
  note_text text := nullif(left(trim(coalesce(response_note, '')), 500), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  caller_is_pm := public.is_project_pm(target_project_id);

  select id, member_id into followup_id, followup_member_id
  from public.assignment_followups
  where project_id = target_project_id and task_id = target_task_id and status = 'open'
    and (member_id = auth.uid() or caller_is_pm)
  order by created_at desc
  limit 1
  for update;
  if not found then raise exception 'Open assignment follow-up not found' using errcode = 'P0002'; end if;

  update public.assignment_followups
  set status = 'resolved', resolved_at = now(), notified_at = coalesce(notified_at, now())
  where id = followup_id;

  insert into public.task_activity_events (project_id, task_id, actor_id, event_type, metadata)
  values (target_project_id, target_task_id, auth.uid(), 'support_requested',
    jsonb_build_object('source', 'assignment_followup', 'note', note_text));

  if followup_member_id = auth.uid() then
    insert into public.risk_events (project_id, user_id, task_id, type, severity, summary, metadata)
    values (target_project_id, auth.uid(), target_task_id, 'overload', 'medium',
      'Thành viên đã phản hồi follow-up và yêu cầu PM hỗ trợ.',
      jsonb_build_object('source', 'assignment_followup', 'note', note_text));
  end if;
  return true;
end;
$$;

revoke all on function public.respond_assignment_followup(uuid, uuid, text) from public;
grant execute on function public.respond_assignment_followup(uuid, uuid, text) to authenticated;

notify pgrst, 'reload schema';
