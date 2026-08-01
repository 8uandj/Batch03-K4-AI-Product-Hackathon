-- Idempotent repair for environments where 017/018 were applied without 014.

create table if not exists public.deadline_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('assignee_check_in', 'leader_escalation')),
  content text not null,
  overdue_hours integer not null check (overdue_hours >= 0),
  notification_day date not null,
  tone text not null default 'neutral' check (tone in ('gentle', 'neutral', 'urgent')),
  trigger_reason text not null default 'overdue',
  action_link text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, recipient_user_id, kind, notification_day)
);

alter table public.deadline_notifications
  add column if not exists tone text not null default 'neutral',
  add column if not exists trigger_reason text not null default 'overdue',
  add column if not exists action_link text;

create index if not exists deadline_notifications_recipient_idx
  on public.deadline_notifications (recipient_user_id, project_id, created_at desc);
create index if not exists deadline_notifications_project_idx
  on public.deadline_notifications (project_id, created_at desc);

alter table public.deadline_notifications enable row level security;

drop policy if exists "Users can read own deadline notifications" on public.deadline_notifications;
create policy "Users can read own deadline notifications"
  on public.deadline_notifications for select to authenticated
  using (recipient_user_id = auth.uid());

drop policy if exists "Users can mark own deadline notifications read" on public.deadline_notifications;
create policy "Users can mark own deadline notifications read"
  on public.deadline_notifications for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

notify pgrst, 'reload schema';
