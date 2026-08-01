-- Recompute force-assign risk inside the database. Client-provided risk is
-- treated as preview evidence only and cannot bypass the protection.
create or replace function public.assignment_risk_for_member(target_project_id uuid, target_user_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  open_count integer;
  overdue_count integer;
  stale_count integer;
  behavioral_enabled boolean;
  late_night_enabled boolean;
  behavioral_score integer := 0;
  actual_score integer;
  daily_open numeric;
  daily_doing numeric;
  daily_overdue numeric;
  daily_stale numeric;
  daily_reminders numeric;
  daily_completed numeric;
  daily_late numeric;
begin
  select count(*) filter (where status <> 'done'),
    count(*) filter (where status <> 'done' and due_at is not null and due_at < now()),
    count(*) filter (where status = 'doing' and updated_at < now() - interval '48 hours')
  into open_count, overdue_count, stale_count
  from public.tasks where project_id = target_project_id and assignee_id = target_user_id;

  select coalesce(behavioral_insights_enabled, true), coalesce(late_night_signal_enabled, true)
  into behavioral_enabled, late_night_enabled
  from public.member_ai_preferences
  where project_id = target_project_id and user_id = target_user_id;

  if behavioral_enabled then
    select coalesce(sum(open_tasks), 0), coalesce(sum(doing_tasks), 0), coalesce(sum(overdue_tasks), 0),
      coalesce(sum(stale_doing_tasks), 0), coalesce(sum(reminder_count), 0), coalesce(sum(completed_tasks), 0),
      coalesce(sum(case when late_night_enabled then late_night_updates else 0 end), 0)
    into daily_open, daily_doing, daily_overdue, daily_stale, daily_reminders, daily_completed, daily_late
    from public.member_activity_daily
    where project_id = target_project_id and user_id = target_user_id
      and activity_date >= current_date - 6;
    behavioral_score := least(100, round(
      least(100, daily_overdue / greatest(1, daily_open + daily_overdue) * 100) * 0.25 +
      greatest(least(100, daily_stale / greatest(1, daily_doing) * 100), least(100, daily_overdue / greatest(1, daily_open + daily_overdue) * 100)) * 0.20 +
      least(100, daily_open / 56 * 100) * 0.20 +
      least(100, daily_reminders / 21 * 100) * 0.15 +
      least(100, daily_late / greatest(1, daily_open + daily_completed) * 100) * 0.10 +
      (100 - least(100, daily_completed / greatest(1, daily_completed + daily_overdue) * 100)) * 0.10
    ));
  end if;

  actual_score := greatest(least(100, open_count * 10 + overdue_count * 20 + stale_count * 20), behavioral_score);
  return case when actual_score >= 80 then 'critical' when actual_score >= 60 then 'high' when actual_score >= 40 then 'moderate' else 'low' end;
end;
$$;

create or replace function public.guard_assignment_decision_risk()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actual_risk text;
begin
  if new.task_id is null or new.selected_user_id is null then return new; end if;
  actual_risk := public.assignment_risk_for_member(new.project_id, new.selected_user_id);
  new.risk_level := actual_risk;
  if actual_risk in ('high', 'critical') and (nullif(trim(coalesce(new.override_reason, '')), '') is null or nullif(trim(coalesce(new.mitigation, '')), '') is null) then
    raise exception 'Database risk guard requires override reason and mitigation' using errcode = '23514';
  end if;
  if actual_risk = 'critical' and new.mitigation <> 'emergency' then
    raise exception 'Database risk guard requires emergency mitigation for critical assignment' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists assignment_decision_risk_guard on public.assignment_decisions;
create trigger assignment_decision_risk_guard
  before insert on public.assignment_decisions
  for each row execute function public.guard_assignment_decision_risk();

revoke all on function public.assignment_risk_for_member(uuid, uuid) from public;
grant execute on function public.assignment_risk_for_member(uuid, uuid) to authenticated;
revoke all on function public.guard_assignment_decision_risk() from public;

notify pgrst, 'reload schema';
