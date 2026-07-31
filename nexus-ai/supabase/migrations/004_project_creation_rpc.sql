-- Atomic project creation for Supabase Auth + RLS.
-- Creates the project, assigns the caller as PM, and prepares default chat rooms.

create or replace function public.create_project_with_pm(
  project_name text,
  project_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
  new_project_id uuid;
begin
  if caller_id is null then
    raise exception 'Bạn cần đăng nhập để tạo project.';
  end if;

  if project_name is null or length(trim(project_name)) = 0 then
    raise exception 'Tên project không được để trống.';
  end if;

  insert into public.users (id, name)
  values (
    caller_id,
    coalesce(
      nullif(auth.jwt() -> 'user_metadata' ->> 'name', ''),
      auth.jwt() ->> 'email',
      caller_id::text
    )
  )
  on conflict (id) do update
    set name = coalesce(public.users.name, excluded.name);

  insert into public.projects (name, description, owner_id)
  values (trim(project_name), nullif(trim(coalesce(project_description, '')), ''), caller_id)
  returning id into new_project_id;

  insert into public.project_members (project_id, user_id, role)
  values (new_project_id, caller_id, 'pm');

  insert into public.chat_rooms (project_id, type, name)
  values
    (new_project_id, 'team', 'Team Chat'),
    (new_project_id, 'bot', 'Nexus Bot')
  on conflict (project_id, type) do nothing;

  return new_project_id;
end;
$$;

grant execute on function public.create_project_with_pm(text, text) to authenticated;

notify pgrst, 'reload schema';
