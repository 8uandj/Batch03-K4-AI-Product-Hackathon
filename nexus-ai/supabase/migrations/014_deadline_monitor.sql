-- Migration 014: daily deadline follow-ups for private member coaching and PM escalation.

create table if not exists public.deadline_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  kind text not null
    check (kind in ('assignee_check_in', 'leader_escalation')),
  content text not null,
  overdue_hours integer not null check (overdue_hours >= 0),
  notification_day date not null,
  read_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  unique (task_id, recipient_user_id, kind, notification_day)
);

create index if not exists deadline_notifications_recipient_idx
  on public.deadline_notifications (recipient_user_id, project_id, created_at desc);

create index if not exists deadline_notifications_project_idx
  on public.deadline_notifications (project_id, created_at desc);

alter table public.deadline_notifications enable row level security;

drop policy if exists "Users can read own deadline notifications"
  on public.deadline_notifications;
create policy "Users can read own deadline notifications"
  on public.deadline_notifications for select
  to authenticated
  using (recipient_user_id = auth.uid());

drop policy if exists "Users can mark own deadline notifications read"
  on public.deadline_notifications;
create policy "Users can mark own deadline notifications read"
  on public.deadline_notifications for update
  to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

notify pgrst, 'reload schema';
