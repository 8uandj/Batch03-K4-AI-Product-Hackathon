-- Joining by project UUID creates the same approval request as an invite link.

create or replace function public.request_project_membership(target_project_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text;
begin
  if caller_id is null then raise exception 'Bạn cần đăng nhập để tham gia project.'; end if;
  if not exists (select 1 from public.projects where id = target_project_id) then
    raise exception 'Không tìm thấy project với UUID này.';
  end if;

  perform public.ensure_user_profile();
  select lower(email) into caller_email from public.users where id = caller_id;

  if exists (select 1 from public.project_members where project_id = target_project_id and user_id = caller_id) then
    return target_project_id;
  end if;
  if caller_email is null then raise exception 'Tài khoản chưa có email để tạo yêu cầu.'; end if;

  if not exists (
    select 1 from public.project_invites
    where project_id = target_project_id
      and lower(email) = caller_email
      and status = 'awaiting_approval'
  ) then
    insert into public.project_invites (project_id, email, role, status, expires_at)
    values (target_project_id, caller_email, 'member', 'awaiting_approval', now() + interval '7 days');
  end if;

  return target_project_id;
end;
$$;

grant execute on function public.request_project_membership(uuid) to authenticated;
notify pgrst, 'reload schema';
