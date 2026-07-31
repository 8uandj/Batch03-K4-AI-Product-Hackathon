-- Invite/join project and public user profile fields.

alter table public.users
  add column if not exists user_code text unique,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists cv_url text;

create index if not exists users_user_code_idx on public.users (user_code);

create or replace function public.generate_user_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'NX-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 6));
    exit when not exists (select 1 from public.users where user_code = candidate);
  end loop;

  return candidate;
end;
$$;

create or replace function public.ensure_user_profile()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  caller_email text := auth.jwt() ->> 'email';
  caller_name text := nullif(auth.jwt() -> 'user_metadata' ->> 'name', '');
  profile public.users;
begin
  if caller_id is null then
    raise exception 'Bạn cần đăng nhập.';
  end if;

  insert into public.users (id, email, name, user_code)
  values (
    caller_id,
    caller_email,
    coalesce(caller_name, caller_email, caller_id::text),
    public.generate_user_code()
  )
  on conflict (id) do update set
    email = coalesce(public.users.email, excluded.email),
    name = coalesce(public.users.name, excluded.name),
    user_code = coalesce(public.users.user_code, public.generate_user_code()),
    updated_at = now()
  returning * into profile;

  return profile;
end;
$$;

create or replace function public.create_project_invite(
  target_project_id uuid,
  invitee_email text default null,
  invitee_user_code text default null,
  invite_role text default 'member'
)
returns public.project_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(nullif(trim(coalesce(invitee_email, '')), ''));
  normalized_code text := upper(nullif(trim(coalesce(invitee_user_code, '')), ''));
  resolved_email text;
  new_invite public.project_invites;
begin
  if auth.uid() is null then
    raise exception 'Bạn cần đăng nhập để mời thành viên.';
  end if;

  if not public.is_project_pm(target_project_id) then
    raise exception 'Chỉ PM của project mới được mời thành viên.';
  end if;

  if invite_role not in ('pm', 'member') then
    raise exception 'Role invite không hợp lệ.';
  end if;

  if normalized_code is not null then
    select lower(email) into resolved_email
    from public.users
    where user_code = normalized_code;

    if resolved_email is null then
      raise exception 'Không tìm thấy user code này.';
    end if;
  end if;

  resolved_email := coalesce(normalized_email, resolved_email);
  if resolved_email is null then
    raise exception 'Vui lòng nhập email hoặc user code.';
  end if;

  insert into public.project_invites (project_id, email, role, expires_at)
  values (target_project_id, resolved_email, invite_role, now() + interval '7 days')
  returning * into new_invite;

  return new_invite;
end;
$$;

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

  if invite.status <> 'pending' then
    raise exception 'Invite này không còn hiệu lực.';
  end if;

  if invite.expires_at is not null and invite.expires_at < now() then
    update public.project_invites set status = 'expired' where id = invite.id;
    raise exception 'Invite đã hết hạn.';
  end if;

  if lower(invite.email) <> caller_email then
    raise exception 'Email tài khoản hiện tại không khớp invite.';
  end if;

  insert into public.project_members (project_id, user_id, role)
  values (invite.project_id, caller_id, invite.role)
  on conflict (project_id, user_id) do update set role = excluded.role;

  update public.project_invites set status = 'accepted' where id = invite.id;

  return invite.project_id;
end;
$$;

grant execute on function public.generate_user_code() to authenticated;
grant execute on function public.ensure_user_profile() to authenticated;
grant execute on function public.create_project_invite(uuid, text, text, text) to authenticated;
grant execute on function public.accept_project_invite(text) to authenticated;

notify pgrst, 'reload schema';
