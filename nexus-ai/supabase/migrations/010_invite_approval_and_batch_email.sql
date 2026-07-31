-- Batch invites remain independently reviewable after the invitee opens the link.

do $$
begin
  alter table public.project_invites drop constraint if exists project_invites_status_check;
  alter table public.project_invites
    add constraint project_invites_status_check
    check (status in ('pending', 'awaiting_approval', 'accepted', 'revoked', 'expired'));
exception when duplicate_object then
  null;
end $$;

create or replace function public.accept_project_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := lower(auth.jwt() ->> 'email');
  invite public.project_invites;
begin
  if caller_id is null then
    raise exception 'Bạn cần đăng nhập để join project.';
  end if;

  perform public.ensure_user_profile();

  select * into invite
  from public.project_invites
  where token = invite_token
  limit 1;

  if invite.id is null then
    raise exception 'Invite token không hợp lệ.';
  end if;

  if invite.status not in ('pending', 'awaiting_approval') then
    raise exception 'Invite này không còn hiệu lực.';
  end if;

  if invite.expires_at is not null and invite.expires_at < now() then
    update public.project_invites set status = 'expired' where id = invite.id;
    raise exception 'Invite đã hết hạn.';
  end if;

  if lower(invite.email) <> caller_email then
    raise exception 'Email tài khoản hiện tại không khớp invite.';
  end if;

  if exists (
    select 1 from public.project_members
    where project_id = invite.project_id and user_id = caller_id
  ) then
    update public.project_invites set status = 'accepted' where id = invite.id;
  else
    update public.project_invites set status = 'awaiting_approval' where id = invite.id;
  end if;

  return invite.project_id;
end;
$$;

create or replace function public.approve_project_invite(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.project_invites;
  caller_id uuid := auth.uid();
begin
  if caller_id is null or not public.is_project_pm((select project_id from public.project_invites where id = invite_id)) then
    raise exception 'Chỉ PM của project mới được duyệt thành viên.';
  end if;

  select * into invite from public.project_invites where id = invite_id for update;
  if invite.id is null then raise exception 'Không tìm thấy invite.'; end if;
  if invite.status not in ('pending', 'awaiting_approval') then raise exception 'Invite chưa ở trạng thái chờ duyệt.'; end if;

  insert into public.project_members (project_id, user_id, role)
  select invite.project_id, u.id, invite.role
  from public.users u
  where lower(u.email) = lower(invite.email)
  on conflict (project_id, user_id) do update set role = excluded.role;

  if not found then raise exception 'Chưa tìm thấy tài khoản đã nhận invite.'; end if;
  update public.project_invites set status = 'accepted' where id = invite.id;
  return invite.project_id;
end;
$$;

create or replace function public.reject_project_invite(invite_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite public.project_invites;
  caller_id uuid := auth.uid();
begin
  select * into invite from public.project_invites where id = invite_id for update;
  if invite.id is null then raise exception 'Không tìm thấy invite.'; end if;
  if caller_id is null or not public.is_project_pm(invite.project_id) then
    raise exception 'Chỉ PM của project mới được từ chối thành viên.';
  end if;
  if invite.status not in ('pending', 'awaiting_approval') then raise exception 'Invite chưa ở trạng thái chờ duyệt.'; end if;

  update public.project_invites set status = 'revoked' where id = invite.id;
  return invite.project_id;
end;
$$;

grant execute on function public.approve_project_invite(uuid) to authenticated;
grant execute on function public.reject_project_invite(uuid) to authenticated;
notify pgrst, 'reload schema';
