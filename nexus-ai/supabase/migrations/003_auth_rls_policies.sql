-- Product-ready Row Level Security policies for Nexus AI workspace.
-- Run after 001_document_rag.sql and 002_workspace_core.sql.

create or replace function public.is_project_member(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = auth.uid()
  );
$$;

create or replace function public.is_project_pm(target_project_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members pm
    where pm.project_id = target_project_id
      and pm.user_id = auth.uid()
      and pm.role = 'pm'
  );
$$;

alter table public.users enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_invites enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.ai_summaries enable row level security;
alter table public.ai_recommendations enable row level security;
alter table public.risk_events enable row level security;

drop policy if exists "Users can read profiles" on public.users;
create policy "Users can read profiles"
  on public.users for select
  to authenticated
  using (true);

drop policy if exists "Users can insert own profile" on public.users;
create policy "Users can insert own profile"
  on public.users for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Members can read projects" on public.projects;
create policy "Members can read projects"
  on public.projects for select
  to authenticated
  using (public.is_project_member(id));

drop policy if exists "Authenticated users can create owned projects" on public.projects;
create policy "Authenticated users can create owned projects"
  on public.projects for insert
  to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "Project owners can update projects" on public.projects;
create policy "Project owners can update projects"
  on public.projects for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Members can read project memberships" on public.project_members;
create policy "Members can read project memberships"
  on public.project_members for select
  to authenticated
  using (user_id = auth.uid() or public.is_project_member(project_id));

drop policy if exists "Users can join as initial PM or PM can add members" on public.project_members;
create policy "Users can join as initial PM or PM can add members"
  on public.project_members for insert
  to authenticated
  with check (
    (user_id = auth.uid() and role = 'pm')
    or public.is_project_pm(project_id)
  );

drop policy if exists "PM can manage invites" on public.project_invites;
create policy "PM can manage invites"
  on public.project_invites for all
  to authenticated
  using (public.is_project_pm(project_id))
  with check (public.is_project_pm(project_id));

drop policy if exists "Project members can read documents" on public.documents;
create policy "Project members can read documents"
  on public.documents for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Project members can insert documents" on public.documents;
create policy "Project members can insert documents"
  on public.documents for insert
  to authenticated
  with check (public.is_project_member(project_id));

drop policy if exists "Project members can manage tasks" on public.tasks;
create policy "Project members can manage tasks"
  on public.tasks for all
  to authenticated
  using (project_id is null or public.is_project_member(project_id))
  with check (project_id is null or public.is_project_member(project_id));

drop policy if exists "Project members can read chat rooms" on public.chat_rooms;
create policy "Project members can read chat rooms"
  on public.chat_rooms for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Project members can create chat rooms" on public.chat_rooms;
create policy "Project members can create chat rooms"
  on public.chat_rooms for insert
  to authenticated
  with check (public.is_project_member(project_id));

drop policy if exists "Project members can read chat messages" on public.chat_messages;
create policy "Project members can read chat messages"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and public.is_project_member(cr.project_id)
    )
  );

drop policy if exists "Project members can send chat messages" on public.chat_messages;
create policy "Project members can send chat messages"
  on public.chat_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id
        and public.is_project_member(cr.project_id)
    )
  );

drop policy if exists "Project members can read AI summaries" on public.ai_summaries;
create policy "Project members can read AI summaries"
  on public.ai_summaries for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Project members can read AI recommendations" on public.ai_recommendations;
create policy "Project members can read AI recommendations"
  on public.ai_recommendations for select
  to authenticated
  using (public.is_project_member(project_id));

drop policy if exists "Project members can read risk events" on public.risk_events;
create policy "Project members can read risk events"
  on public.risk_events for select
  to authenticated
  using (public.is_project_member(project_id));

notify pgrst, 'reload schema';
