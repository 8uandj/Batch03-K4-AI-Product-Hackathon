-- Project knowledge analysis MVP: generate task recommendations from documents + members.

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
      'Rule-based MVP: project có ' || doc_count || ' document chunks; member có skills: ' || array_to_string(member_record.skills, ', ') || '. PM review trước khi tạo task Kanban.',
      jsonb_build_object(
        'document_chunks', doc_count,
        'skills', member_record.skills,
        'suggested_tasks', jsonb_build_array(
          'Review tài liệu dự án và xác nhận scope',
          'Đề xuất task phù hợp với skills cá nhân',
          'Cập nhật blocker/deadline lên board'
        ),
        'generated_by', 'rule_based_project_knowledge_mvp'
      ),
      'suggested'
    ) returning * into recommendation;

    return next recommendation;
  end loop;

  return;
end;
$$;

grant execute on function public.generate_project_recommendations(uuid) to authenticated;

notify pgrst, 'reload schema';
