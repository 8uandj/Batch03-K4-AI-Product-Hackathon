-- Existing workspaces already have 025/026 installed. Recreate both task
-- mutation RPCs so risk is recomputed before persistence and the member gets
-- a private warning when a PM overrides high/critical risk.

create or replace function public.create_manual_task(
  target_project_id uuid,
  task_title text,
  task_description text,
  task_priority text,
  target_assignee_id uuid,
  task_skills text[],
  task_due_at timestamptz,
  dependency_task_id uuid,
  task_origin text,
  task_source_type text,
  source_task_id uuid,
  task_effort_size text,
  task_is_urgent boolean,
  task_acceptance_criteria text,
  decision_input jsonb default '{}'::jsonb
)
returns setof public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  member_task_creation boolean;
  created_task public.tasks%rowtype;
  decision_risk text := coalesce(decision_input->>'risk_level', 'low');
  override_reason text := nullif(trim(decision_input->>'override_reason'), '');
  mitigation text := nullif(trim(decision_input->>'mitigation'), '');
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select role into caller_role from public.project_members where project_id = target_project_id and user_id = auth.uid();
  if caller_role is null then raise exception 'Project membership required' using errcode = '42501'; end if;
  select allow_member_task_creation into member_task_creation from public.projects where id = target_project_id;
  if caller_role <> 'pm' and coalesce(member_task_creation, false) is not true then raise exception 'Member task creation is disabled for this project' using errcode = '42501'; end if;
  if not exists (select 1 from public.project_members where project_id = target_project_id and user_id = target_assignee_id) then raise exception 'Assignee must belong to the project' using errcode = '23514'; end if;
  if dependency_task_id is not null and not exists (select 1 from public.tasks where id = dependency_task_id and project_id = target_project_id) then raise exception 'Dependency task must belong to the same project' using errcode = '23514'; end if;
  if source_task_id is not null and not exists (select 1 from public.tasks where id = source_task_id and project_id = target_project_id and status = 'done') then raise exception 'Source task must be a completed task in the same project' using errcode = '23514'; end if;

  decision_risk := public.assignment_risk_for_member(target_project_id, target_assignee_id);
  if decision_risk in ('high', 'critical') and (override_reason is null or mitigation is null) then raise exception 'High-risk assignment requires override reason and mitigation' using errcode = '23514'; end if;
  if decision_risk = 'critical' and mitigation <> 'emergency' then raise exception 'Critical force-assign requires emergency mitigation' using errcode = '23514'; end if;

  insert into public.tasks (
    project_id, title, description, status, priority, assignee_id, required_skills,
    due_at, blocked_by_task_id, origin, source_type, source_task_id, created_by,
    effort_size, is_urgent, acceptance_criteria
  ) values (
    target_project_id, left(trim(task_title), 160), nullif(left(trim(task_description), 4000), ''),
    case when source_task_id is not null then 'rework' else 'todo' end,
    task_priority, target_assignee_id, coalesce(task_skills, '{}'::text[]), task_due_at,
    dependency_task_id, task_origin, task_source_type, source_task_id, auth.uid(),
    task_effort_size, coalesce(task_is_urgent, false), nullif(left(trim(task_acceptance_criteria), 2000), '')
  ) returning * into created_task;

  insert into public.task_activity_events (project_id, task_id, actor_id, event_type, to_value, metadata)
  values (target_project_id, created_task.id, auth.uid(), 'created', created_task.status, jsonb_build_object('origin', task_origin, 'source_type', task_source_type));
  insert into public.assignment_decisions (
    project_id, task_id, actor_id, suggested_user_id, selected_user_id, project_phase,
    risk_level, weights, evidence, override_reason, mitigation
  ) values (
    target_project_id, created_task.id, auth.uid(), nullif(decision_input->>'suggested_user_id', '')::uuid,
    target_assignee_id, coalesce(decision_input->>'project_phase', 'normal'), decision_risk,
    coalesce(decision_input->'weights', '{}'::jsonb), coalesce(decision_input->'evidence', '{}'::jsonb),
    override_reason, mitigation
  );

  if caller_role = 'pm' and decision_risk in ('high', 'critical') and override_reason is not null and mitigation is not null then
    insert into public.assignment_followups (project_id, task_id, member_id, created_by, override_reason, mitigation)
    values (target_project_id, created_task.id, target_assignee_id, auth.uid(), override_reason, mitigation);
    insert into public.deadline_notifications (
      project_id, task_id, recipient_user_id, kind, content, overdue_hours, notification_day, tone, trigger_reason, action_link
    ) values (
      target_project_id, created_task.id, target_assignee_id, 'force_assign_warning',
      'Nexus ghi nhận bạn vừa được giao thêm task trong khi workload đang ở mức ' || decision_risk || '. Bạn có thể bấm Tôi cần hỗ trợ nếu cần dời task, thêm người hoặc giảm scope.',
      0, current_date, 'urgent', 'force_assign_override', '/project/' || target_project_id::text || '/board?task=' || created_task.id::text
    );
  end if;
  return next created_task;
end;
$$;

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
  if not exists (select 1 from public.project_members where project_id = target_project_id and user_id = target_assignee_id) then raise exception 'Assignee must belong to the project' using errcode = '23514'; end if;
  select * into current_task from public.tasks where id = target_task_id and project_id = target_project_id for update;
  if not found then raise exception 'Task not found in project' using errcode = 'P0002'; end if;

  decision_risk := public.assignment_risk_for_member(target_project_id, target_assignee_id);
  if decision_risk in ('high', 'critical') and (override_reason is null or mitigation is null) then raise exception 'High-risk assignment requires override reason and mitigation' using errcode = '23514'; end if;
  if decision_risk = 'critical' and mitigation <> 'emergency' then raise exception 'Critical force-assign requires emergency mitigation' using errcode = '23514'; end if;

  update public.tasks set assignee_id = target_assignee_id, updated_at = now() where id = target_task_id and project_id = target_project_id returning * into updated_task;
  insert into public.task_activity_events (project_id, task_id, actor_id, event_type, from_value, to_value, metadata)
  values (target_project_id, target_task_id, auth.uid(), 'reassigned', current_task.assignee_id::text, target_assignee_id::text, jsonb_build_object('source', 'reassign_rpc'));
  insert into public.assignment_decisions (
    project_id, task_id, actor_id, suggested_user_id, selected_user_id, project_phase,
    risk_level, weights, evidence, override_reason, mitigation
  ) values (
    target_project_id, target_task_id, auth.uid(), nullif(decision_input->>'suggested_user_id', '')::uuid,
    target_assignee_id, coalesce(decision_input->>'project_phase', 'normal'), decision_risk,
    coalesce(decision_input->'weights', '{}'::jsonb), coalesce(decision_input->'evidence', '{}'::jsonb), override_reason, mitigation
  );
  if decision_risk in ('high', 'critical') and override_reason is not null and mitigation is not null then
    insert into public.assignment_followups (project_id, task_id, member_id, created_by, override_reason, mitigation)
    values (target_project_id, target_task_id, target_assignee_id, auth.uid(), override_reason, mitigation);
    insert into public.deadline_notifications (
      project_id, task_id, recipient_user_id, kind, content, overdue_hours, notification_day, tone, trigger_reason, action_link
    ) values (
      target_project_id, target_task_id, target_assignee_id, 'force_assign_warning',
      'Nexus ghi nhận task này được giao cho bạn trong khi workload đang ở mức ' || decision_risk || '. Bạn có thể bấm Tôi cần hỗ trợ nếu cần dời task, thêm người hoặc giảm scope.',
      0, current_date, 'urgent', 'force_assign_override', '/project/' || target_project_id::text || '/board?task=' || target_task_id::text
    );
  end if;
  return next updated_task;
end;
$$;

revoke all on function public.create_manual_task(uuid, text, text, text, uuid, text[], timestamptz, uuid, text, text, uuid, text, boolean, text, jsonb) from public;
grant execute on function public.create_manual_task(uuid, text, text, text, uuid, text[], timestamptz, uuid, text, text, uuid, text, boolean, text, jsonb) to authenticated;
revoke all on function public.reassign_task(uuid, uuid, uuid, jsonb) from public;
grant execute on function public.reassign_task(uuid, uuid, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
