-- Extend project isolation to team-health events, notifications and
-- assignment follow-ups, including service-role writes.
create or replace function public.validate_risk_event_project_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.task_id is not null and not exists (
    select 1 from public.tasks where id = new.task_id and project_id = new.project_id
  ) then
    raise exception 'Risk event task does not belong to the event project';
  end if;
  if new.user_id is not null and not exists (
    select 1 from public.project_members where project_id = new.project_id and user_id = new.user_id
  ) then
    raise exception 'Risk event user does not belong to the event project';
  end if;
  return new;
end;
$$;

drop trigger if exists risk_event_project_guard on public.risk_events;
create trigger risk_event_project_guard
  before insert or update on public.risk_events
  for each row execute function public.validate_risk_event_project_reference();

create or replace function public.validate_deadline_notification_project_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.tasks where id = new.task_id and project_id = new.project_id
  ) then
    raise exception 'Notification task does not belong to the notification project';
  end if;
  if not exists (
    select 1 from public.project_members where project_id = new.project_id and user_id = new.recipient_user_id
  ) then
    raise exception 'Notification recipient does not belong to the notification project';
  end if;
  return new;
end;
$$;

drop trigger if exists deadline_notification_project_guard on public.deadline_notifications;
create trigger deadline_notification_project_guard
  before insert or update on public.deadline_notifications
  for each row execute function public.validate_deadline_notification_project_reference();

create or replace function public.validate_assignment_followup_project_reference()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.tasks where id = new.task_id and project_id = new.project_id
  ) then
    raise exception 'Follow-up task does not belong to the follow-up project';
  end if;
  if not exists (
    select 1 from public.project_members where project_id = new.project_id and user_id = new.member_id
  ) then
    raise exception 'Follow-up member does not belong to the follow-up project';
  end if;
  if not exists (
    select 1 from public.project_members where project_id = new.project_id and user_id = new.created_by
  ) then
    raise exception 'Follow-up creator does not belong to the follow-up project';
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_followup_project_guard on public.assignment_followups;
create trigger assignment_followup_project_guard
  before insert or update on public.assignment_followups
  for each row execute function public.validate_assignment_followup_project_reference();

notify pgrst, 'reload schema';
