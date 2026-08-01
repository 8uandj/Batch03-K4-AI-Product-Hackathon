-- Keep Auto-Tasking approval compatible with workspaces that already ran 020.
-- Every AI-planned task must carry a PM-reviewable acceptance criterion.

create or replace function public.approve_auto_tasking_draft(
  target_project_id uuid,
  recommendation_id uuid,
  approved_tasks jsonb
)
returns setof public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  recommendation_payload jsonb;
  item jsonb;
  inserted_task public.tasks;
  member_ids uuid[];
  due_days integer;
  acceptance_criteria_value text;
begin
  if auth.uid() is null or not public.is_project_pm(target_project_id) then
    raise exception 'Chỉ PM của project mới có quyền duyệt Auto-Tasking.';
  end if;

  if jsonb_typeof(approved_tasks) <> 'array'
    or jsonb_array_length(approved_tasks) = 0
    or jsonb_array_length(approved_tasks) > 10
  then
    raise exception 'Danh sách task draft không hợp lệ.';
  end if;

  select payload into recommendation_payload
  from public.ai_recommendations
  where id = recommendation_id
    and project_id = target_project_id
    and type = 'task_assignment'
    and status = 'suggested'
  for update;

  if recommendation_payload is null or recommendation_payload->>'source' <> 'auto_tasking' then
    raise exception 'Bản nháp Auto-Tasking không tồn tại hoặc đã được duyệt.';
  end if;

  select array_agg(user_id) into member_ids
  from public.project_members
  where project_id = target_project_id;

  update public.ai_recommendations
  set status = 'accepted',
      payload = jsonb_build_object('tasks', approved_tasks, 'source', 'auto_tasking', 'mode', 'approved')
  where id = recommendation_id;

  for item in select value from jsonb_array_elements(approved_tasks)
  loop
    acceptance_criteria_value := left(trim(item->>'acceptance_criteria'), 2000);
    if coalesce(length(trim(item->>'title')), 0) < 3
      or coalesce(length(trim(item->>'description')), 0) < 3
      or coalesce(length(acceptance_criteria_value), 0) < 3
      or not (item->>'assignee_id')::uuid = any(member_ids)
    then
      raise exception 'Task draft chứa dữ liệu không hợp lệ hoặc assignee ngoài project.';
    end if;

    due_days := greatest(1, least(30, coalesce((item->>'due_in_days')::integer, 1)));

    insert into public.tasks (
      project_id, title, description, acceptance_criteria, status, priority, assignee_id,
      required_skills, due_at, origin, source_type, created_by,
      effort_size, is_urgent
    ) values (
      target_project_id,
      trim(item->>'title'),
      trim(item->>'description'),
      acceptance_criteria_value,
      'todo',
      case when item->>'priority' in ('low', 'high') then item->>'priority' else 'medium' end,
      (item->>'assignee_id')::uuid,
      coalesce(array(select jsonb_array_elements_text(item->'required_skills')), '{}'::text[]),
      now() + make_interval(days => due_days),
      'ai_planned', null, auth.uid(), 'medium', false
    ) returning * into inserted_task;

    insert into public.task_activity_events (
      project_id, task_id, actor_id, event_type, to_value, metadata
    ) values (
      target_project_id, inserted_task.id, auth.uid(), 'created', 'todo',
      jsonb_build_object('origin', 'ai_planned', 'recommendation_id', recommendation_id)
    );

    return next inserted_task;
  end loop;

  return;
end;
$$;

revoke all on function public.approve_auto_tasking_draft(uuid, uuid, jsonb) from public;
grant execute on function public.approve_auto_tasking_draft(uuid, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
