-- Atomic approval for the legacy AI Planner flow.
create or replace function public.approve_planner_draft(
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
begin
  if auth.uid() is null or not public.is_project_pm(target_project_id) then
    raise exception 'Chỉ PM của project mới có quyền phê duyệt kế hoạch.' using errcode = '42501';
  end if;
  if jsonb_typeof(approved_tasks) <> 'array' or jsonb_array_length(approved_tasks) = 0 or jsonb_array_length(approved_tasks) > 20 then
    raise exception 'Danh sách task planner không hợp lệ.' using errcode = '23514';
  end if;

  select payload into recommendation_payload
  from public.ai_recommendations
  where id = recommendation_id and project_id = target_project_id
    and type = 'task_assignment' and status = 'suggested'
  for update;
  if recommendation_payload is null then
    raise exception 'Bản nháp không tồn tại hoặc đã được phê duyệt.' using errcode = 'P0002';
  end if;

  select array_agg(user_id) into member_ids from public.project_members where project_id = target_project_id;
  update public.ai_recommendations set status = 'accepted', payload = jsonb_build_object('tasks', approved_tasks, 'mode', 'approved') where id = recommendation_id;

  for item in select value from jsonb_array_elements(approved_tasks)
  loop
    if coalesce(length(trim(item->>'title')), 0) < 3
      or coalesce(length(trim(item->>'description')), 0) < 3
      or not (item->>'assignee_id')::uuid = any(member_ids)
    then raise exception 'Task planner chứa dữ liệu không hợp lệ hoặc assignee ngoài project.' using errcode = '23514'; end if;
    due_days := greatest(1, least(365, coalesce((item->>'due_in_days')::integer, 1)));
    insert into public.tasks (
      project_id, title, description, status, priority, assignee_id, required_skills,
      due_at, origin, created_by, effort_size, is_urgent
    ) values (
      target_project_id, left(trim(item->>'title'), 160), nullif(left(trim(item->>'description'), 4000), ''), 'todo',
      case when item->>'priority' in ('low', 'high') then item->>'priority' else 'medium' end,
      (item->>'assignee_id')::uuid,
      coalesce(array(select jsonb_array_elements_text(item->'required_skills')), '{}'::text[]),
      now() + make_interval(days => due_days), 'ai_planned', auth.uid(), 'medium', false
    ) returning * into inserted_task;
    insert into public.task_activity_events (project_id, task_id, actor_id, event_type, to_value, metadata)
    values (target_project_id, inserted_task.id, auth.uid(), 'created', 'todo', jsonb_build_object('origin', 'ai_planned', 'recommendation_id', recommendation_id));
    return next inserted_task;
  end loop;
end;
$$;

revoke all on function public.approve_planner_draft(uuid, uuid, jsonb) from public;
grant execute on function public.approve_planner_draft(uuid, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';
