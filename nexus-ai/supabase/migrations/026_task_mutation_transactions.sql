-- Keep task mutations and their audit/risk records atomic.
create or replace function public.reassign_task(
  target_project_id uuid,
  target_task_id uuid,
  target_assignee_id uuid,
  decision_input jsonb default '{}'::jsonb
)
returns setof public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  current_task public.tasks%rowtype;
  updated_task public.tasks%rowtype;
  decision_risk text := coalesce(decision_input->>'risk_level', 'low');
  override_reason text := nullif(trim(decision_input->>'override_reason'), '');
  mitigation text := nullif(trim(decision_input->>'mitigation'), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if not public.is_project_pm(target_project_id) then raise exception 'Only project PM can reassign tasks' using errcode = '42501'; end if;
  if not exists (select 1 from public.project_members where project_id = target_project_id and user_id = target_assignee_id) then
    raise exception 'Assignee must belong to the project' using errcode = '23514';
  end if;
  if decision_risk in ('high', 'critical') and (override_reason is null or mitigation is null) then
    raise exception 'High-risk assignment requires override reason and mitigation' using errcode = '23514';
  end if;
  if decision_risk = 'critical' and mitigation <> 'emergency' then
    raise exception 'Critical force-assign requires emergency mitigation' using errcode = '23514';
  end if;

  select * into current_task from public.tasks
  where id = target_task_id and project_id = target_project_id for update;
  if not found then raise exception 'Task not found in project' using errcode = 'P0002'; end if;
  decision_risk := public.assignment_risk_for_member(target_project_id, target_assignee_id);
  if decision_risk in ('high', 'critical') and (override_reason is null or mitigation is null) then
    raise exception 'High-risk assignment requires override reason and mitigation' using errcode = '23514';
  end if;
  if decision_risk = 'critical' and mitigation <> 'emergency' then
    raise exception 'Critical force-assign requires emergency mitigation' using errcode = '23514';
  end if;

  update public.tasks set assignee_id = target_assignee_id, updated_at = now()
  where id = target_task_id and project_id = target_project_id
  returning * into updated_task;

  insert into public.task_activity_events (project_id, task_id, actor_id, event_type, from_value, to_value, metadata)
  values (target_project_id, target_task_id, auth.uid(), 'reassigned', current_task.assignee_id::text, target_assignee_id::text,
    jsonb_build_object('source', 'reassign_rpc'));
  insert into public.assignment_decisions (
    project_id, task_id, actor_id, suggested_user_id, selected_user_id, project_phase,
    risk_level, weights, evidence, override_reason, mitigation
  ) values (
    target_project_id, target_task_id, auth.uid(),
    nullif(decision_input->>'suggested_user_id', '')::uuid, target_assignee_id,
    coalesce(decision_input->>'project_phase', 'normal'), decision_risk,
    coalesce(decision_input->'weights', '{}'::jsonb), coalesce(decision_input->'evidence', '{}'::jsonb),
    override_reason, mitigation
  );
  if decision_risk in ('high', 'critical') then
    insert into public.assignment_followups (project_id, task_id, member_id, created_by, override_reason, mitigation)
    values (target_project_id, target_task_id, target_assignee_id, auth.uid(), override_reason, mitigation);
  end if;
  if decision_risk in ('high', 'critical') and override_reason is not null and mitigation is not null then
    insert into public.deadline_notifications (
      project_id, task_id, recipient_user_id, kind, content, overdue_hours,
      notification_day, tone, trigger_reason, action_link
    ) values (
      target_project_id, target_task_id, target_assignee_id, 'force_assign_warning',
      'Nexus ghi nhận task này được giao cho bạn trong khi workload đang ở mức ' || decision_risk || '. Bạn có thể bấm Tôi cần hỗ trợ nếu cần dời task, thêm người hoặc giảm scope.',
      0, current_date, 'urgent', 'force_assign_override',
      '/project/' || target_project_id::text || '/board?task=' || target_task_id::text
    );
  end if;
  return next updated_task;
end;
$$;

create or replace function public.update_task_status(
  target_project_id uuid,
  target_task_id uuid,
  next_status text
)
returns setof public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  current_task public.tasks%rowtype;
  updated_task public.tasks%rowtype;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select role into caller_role from public.project_members
  where project_id = target_project_id and user_id = auth.uid();
  if caller_role is null then raise exception 'Project membership required' using errcode = '42501'; end if;
  if next_status not in ('todo', 'doing', 'rework', 'done') then raise exception 'Invalid task status' using errcode = '23514'; end if;
  select * into current_task from public.tasks
  where id = target_task_id and project_id = target_project_id for update;
  if not found then raise exception 'Task not found in project' using errcode = 'P0002'; end if;
  if (current_task.status = 'rework' or next_status = 'rework') and caller_role <> 'pm' then
    raise exception 'Only project PM can change rework status' using errcode = '42501';
  end if;
  if next_status = 'rework' and current_task.status <> 'done' then
    raise exception 'Rework requires a completed task' using errcode = '23514';
  end if;

  update public.tasks set status = next_status, updated_at = now()
  where id = target_task_id and project_id = target_project_id
  returning * into updated_task;
  insert into public.task_activity_events (project_id, task_id, actor_id, event_type, from_value, to_value, metadata)
  values (target_project_id, target_task_id, auth.uid(), case when next_status = 'done' then 'completed' else 'status_changed' end,
    current_task.status, next_status, jsonb_build_object('source', 'status_rpc'));
  return next updated_task;
end;
$$;

create or replace function public.record_task_action(
  target_project_id uuid,
  target_task_id uuid,
  action text,
  note text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  task_assignee uuid;
  task_exists boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select role into caller_role from public.project_members where project_id = target_project_id and user_id = auth.uid();
  select exists (select 1 from public.tasks where id = target_task_id and project_id = target_project_id),
    (select assignee_id from public.tasks where id = target_task_id and project_id = target_project_id)
    into task_exists, task_assignee;
  if caller_role is null or not task_exists then raise exception 'Task or project membership not found' using errcode = 'P0002'; end if;
  if caller_role <> 'pm' and task_assignee <> auth.uid() then raise exception 'Only assignee or PM can record task action' using errcode = '42501'; end if;
  if action not in ('blocker_reported', 'support_requested') then raise exception 'Invalid task action' using errcode = '23514'; end if;
  insert into public.task_activity_events (project_id, task_id, actor_id, event_type, metadata)
  values (target_project_id, target_task_id, auth.uid(), action, jsonb_build_object('note', nullif(left(trim(coalesce(note, '')), 500), ''), 'source', 'action_rpc'));
  if action = 'support_requested' then
    insert into public.risk_events (project_id, user_id, task_id, type, severity, summary, metadata)
    values (target_project_id, auth.uid(), target_task_id, 'overload', 'medium', 'Thành viên đã yêu cầu hỗ trợ cho một task đang thực hiện.', jsonb_build_object('source', 'task_support_request'));
  end if;
  return true;
end;
$$;

revoke all on function public.reassign_task(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.reassign_task(uuid, uuid, uuid, jsonb) to authenticated;
revoke all on function public.update_task_status(uuid, uuid, text) from public;
grant execute on function public.update_task_status(uuid, uuid, text) to authenticated;
revoke all on function public.record_task_action(uuid, uuid, text, text) from public;
grant execute on function public.record_task_action(uuid, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
