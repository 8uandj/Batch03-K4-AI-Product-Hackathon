-- Claim and notify one assignment follow-up atomically. This prevents two
-- overlapping cron invocations from processing the same open follow-up.
create or replace function public.process_assignment_followup(target_followup_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  followup public.assignment_followups%rowtype;
  notification_day date := current_date;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;

  select * into followup
  from public.assignment_followups
  where id = target_followup_id
    and status = 'open'
    and notified_at is null
    and due_at <= now()
  for update skip locked;

  if not found then return false; end if;

  insert into public.deadline_notifications (
    project_id, task_id, recipient_user_id, kind, content, overdue_hours,
    notification_day, tone, trigger_reason, action_link
  ) values (
    followup.project_id,
    followup.task_id,
    followup.member_id,
    'force_assign_followup',
    'Nexus kiểm tra lại task sau lần phân công có cảnh báo. Bạn có cần hỗ trợ, dời task khác hoặc giảm scope không? Phương án đã ghi nhận: ' || followup.mitigation || '.',
    0,
    notification_day,
    'urgent',
    'force_assign_override',
    '/project/' || followup.project_id::text || '/board?task=' || followup.task_id::text
  ) on conflict (task_id, recipient_user_id, kind, notification_day) do nothing;

  update public.assignment_followups
  set notified_at = now()
  where id = followup.id and notified_at is null;

  return true;
end;
$$;

revoke all on function public.process_assignment_followup(uuid) from public;
grant execute on function public.process_assignment_followup(uuid) to service_role;

notify pgrst, 'reload schema';
