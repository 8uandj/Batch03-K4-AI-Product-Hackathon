-- Allow a project PM to remove regular members without exposing a broad DELETE
-- policy on project_members. Assigned tasks remain in the project but become
-- unassigned so they cannot point at a former project member.
create or replace function public.remove_project_member(
  target_project_id uuid,
  target_user_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  target_role text;
begin
  if caller_id is null or not public.is_project_pm(target_project_id) then
    raise exception 'Chỉ PM của project mới được xóa thành viên.' using errcode = '42501';
  end if;

  if target_user_id = caller_id then
    raise exception 'PM không thể tự xóa mình khỏi project.' using errcode = '42501';
  end if;

  select role into target_role
  from public.project_members
  where project_id = target_project_id and user_id = target_user_id
  for update;

  if target_role is null then
    raise exception 'Thành viên không thuộc project.' using errcode = 'P0002';
  end if;
  if target_role <> 'member' then
    raise exception 'Chỉ có thể xóa member, không thể xóa PM.' using errcode = '42501';
  end if;

  update public.tasks
  set assignee_id = null, updated_at = now()
  where project_id = target_project_id and assignee_id = target_user_id;

  delete from public.project_members
  where project_id = target_project_id and user_id = target_user_id;

  return true;
end;
$$;

revoke all on function public.remove_project_member(uuid, uuid) from public;
grant execute on function public.remove_project_member(uuid, uuid) to authenticated;
notify pgrst, 'reload schema';
