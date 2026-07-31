-- Keep the overview recommendations and risk panels in sync with one analysis run.

create or replace function public.generate_project_recommendations(target_project_id uuid)
returns setof public.ai_recommendations
language plpgsql
security definer
set search_path = public
as $$
declare
  doc_count integer := 0;
  member_record record;
  recommendation public.ai_recommendations;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để chạy AI analysis.';
  end if;

  if not public.is_project_pm(target_project_id) then
    raise exception 'Chỉ PM của project mới được chạy AI analysis.';
  end if;

  select count(*) into doc_count
  from public.documents
  where project_id = target_project_id;

  if doc_count = 0 then
    raise exception 'Project chưa có tài liệu. Hãy import tài liệu trước khi chạy AI analysis.';
  end if;

  delete from public.ai_recommendations
  where project_id = target_project_id
    and type = 'task_assignment'
    and status = 'suggested';

  for member_record in
    select
      u.id,
      coalesce(u.name, u.email, u.id::text) as display_name,
      coalesce(u.skills, '{}'::text[]) as skills
    from public.project_members pm
    join public.users u on u.id = pm.user_id
    where pm.project_id = target_project_id
  loop
    insert into public.ai_recommendations (
      project_id,
      type,
      target_user_id,
      title,
      rationale,
      payload,
      status
    ) values (
      target_project_id,
      'task_assignment',
      member_record.id,
      'Đề xuất chia việc cho ' || member_record.display_name,
      'Project có ' || doc_count || ' document chunks; member có skills: ' ||
        coalesce(nullif(array_to_string(member_record.skills, ', '), ''), 'chưa cập nhật') ||
        '. PM review trước khi tạo task Kanban.',
      jsonb_build_object(
        'document_chunks', doc_count,
        'skills', member_record.skills,
        'confidence', 75,
        'suggested_tasks', jsonb_build_array(
          'Review tài liệu dự án và xác nhận scope',
          'Đề xuất task phù hợp với skills cá nhân',
          'Cập nhật blocker/deadline lên board'
        ),
        'generated_by', 'project_analysis'
      ),
      'suggested'
    ) returning * into recommendation;

    return next recommendation;
  end loop;

  -- Rebuild only unresolved risks produced by this analysis function.
  delete from public.risk_events
  where project_id = target_project_id
    and resolved_at is null
    and metadata ->> 'generated_by' = 'project_analysis';

  insert into public.risk_events (
    project_id,
    user_id,
    task_id,
    type,
    severity,
    summary,
    metadata
  )
  select
    task.project_id,
    task.assignee_id,
    task.id,
    'overdue',
    case
      when task.due_at < now() - interval '3 days' then 'high'
      else 'medium'
    end,
    'Task “' || task.title || '” đã quá hạn.',
    jsonb_build_object('generated_by', 'project_analysis', 'due_at', task.due_at)
  from public.tasks task
  where task.project_id = target_project_id
    and task.status <> 'done'
    and task.due_at is not null
    and task.due_at < now();

  insert into public.risk_events (
    project_id,
    user_id,
    type,
    severity,
    summary,
    metadata
  )
  select
    target_project_id,
    task.assignee_id,
    'overload',
    case when count(*) >= 5 then 'high' else 'medium' end,
    coalesce(user_profile.name, user_profile.email, task.assignee_id::text) ||
      ' đang có ' || count(*) || ' task chưa hoàn thành.',
    jsonb_build_object(
      'generated_by', 'project_analysis',
      'open_task_count', count(*)
    )
  from public.tasks task
  join public.users user_profile on user_profile.id = task.assignee_id
  where task.project_id = target_project_id
    and task.status <> 'done'
  group by task.assignee_id, user_profile.name, user_profile.email
  having count(*) >= 3;

  return;
end;
$$;

grant execute on function public.generate_project_recommendations(uuid) to authenticated;

notify pgrst, 'reload schema';
