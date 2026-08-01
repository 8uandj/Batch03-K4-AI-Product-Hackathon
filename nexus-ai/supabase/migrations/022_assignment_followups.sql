-- Follow-up protection for force-assigned high/critical workload.
alter table public.deadline_notifications
  drop constraint if exists deadline_notifications_kind_check;
alter table public.deadline_notifications
  add constraint deadline_notifications_kind_check
  check (kind in ('assignee_check_in', 'leader_escalation', 'force_assign_followup', 'force_assign_warning'));

create table if not exists public.assignment_followups (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  member_id uuid not null references public.users(id) on delete cascade,
  created_by uuid not null references public.users(id) on delete cascade,
  override_reason text not null,
  mitigation text not null,
  due_at timestamptz not null default (now() + interval '24 hours'),
  notified_at timestamptz,
  status text not null default 'open' check (status in ('open', 'resolved')),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists assignment_followups_due_idx
  on public.assignment_followups (status, due_at) where notified_at is null;

alter table public.assignment_followups enable row level security;
drop policy if exists "Project members can read own assignment followups" on public.assignment_followups;
create policy "Project members can read own assignment followups"
  on public.assignment_followups for select to authenticated
  using (member_id = auth.uid() or public.is_project_pm(project_id));
drop policy if exists "PMs can create assignment followups" on public.assignment_followups;
create policy "PMs can create assignment followups"
  on public.assignment_followups for insert to authenticated
  with check (created_by = auth.uid() and public.is_project_pm(project_id));
drop policy if exists "Members can resolve own assignment followups" on public.assignment_followups;
create policy "Members can resolve own assignment followups"
  on public.assignment_followups for update to authenticated
  using (member_id = auth.uid() or public.is_project_pm(project_id))
  with check (member_id = auth.uid() or public.is_project_pm(project_id));

notify pgrst, 'reload schema';
