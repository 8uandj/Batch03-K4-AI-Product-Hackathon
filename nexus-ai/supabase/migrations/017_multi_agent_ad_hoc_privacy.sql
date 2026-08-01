-- NexusAI multi-agent, ad-hoc task and privacy telemetry contract.
-- Keep this migration safe in environments where the earlier deadline migration
-- was skipped: 019 remains idempotent, but 017 must also be runnable on its own.
create table if not exists public.deadline_notifications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  recipient_user_id uuid not null references public.users(id) on delete cascade,
  kind text not null check (kind in ('assignee_check_in', 'leader_escalation')),
  content text not null,
  overdue_hours integer not null default 0 check (overdue_hours >= 0),
  notification_day date not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, recipient_user_id, kind, notification_day)
);

alter table public.deadline_notifications
  add column if not exists tone text not null default 'neutral'
    check (tone in ('gentle', 'neutral', 'urgent')),
  add column if not exists trigger_reason text not null default 'overdue',
  add column if not exists action_link text;

alter table public.tasks
  add column if not exists origin text not null default 'ai_planned'
    check (origin in ('ai_planned', 'manual', 'ad_hoc', 'rework')),
  add column if not exists source_type text
    check (source_type is null or source_type in ('feedback_change', 'bug_fix', 'urgent_request', 'admin_logistics', 'other')),
  add column if not exists source_task_id uuid references public.tasks(id) on delete set null,
  add column if not exists created_by uuid references public.users(id) on delete set null,
  add column if not exists effort_size text not null default 'medium'
    check (effort_size in ('small', 'medium', 'large')),
  add column if not exists is_urgent boolean not null default false,
  add column if not exists acceptance_criteria text;

create table if not exists public.task_activity_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  actor_id uuid references public.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'status_changed', 'assigned', 'reassigned', 'due_date_changed', 'blocker_reported', 'support_requested', 'completed')),
  from_value text,
  to_value text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.assignment_decisions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  actor_id uuid not null references public.users(id) on delete cascade,
  suggested_user_id uuid references public.users(id) on delete set null,
  selected_user_id uuid references public.users(id) on delete set null,
  project_phase text not null check (project_phase in ('normal', 'sprint', 'emergency')),
  risk_level text not null check (risk_level in ('low', 'moderate', 'high', 'critical')),
  weights jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  override_reason text,
  mitigation text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  agent text not null,
  tier text not null check (tier in ('tier1', 'tier2', 'rule')),
  model text,
  status text not null check (status in ('success', 'fallback', 'error')),
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  fallback boolean not null default false,
  error text,
  created_at timestamptz not null default now()
);

create table if not exists public.member_activity_daily (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  activity_date date not null,
  open_tasks integer not null default 0,
  doing_tasks integer not null default 0,
  overdue_tasks integer not null default 0,
  stale_doing_tasks integer not null default 0,
  reminder_count integer not null default 0,
  completed_tasks integer not null default 0,
  late_night_updates integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, user_id, activity_date)
);

create table if not exists public.member_ai_preferences (
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  behavioral_insights_enabled boolean not null default true,
  late_night_signal_enabled boolean not null default true,
  chat_analysis_enabled boolean not null default false,
  timezone text not null default 'Asia/Ho_Chi_Minh',
  updated_at timestamptz not null default now(),
  primary key (user_id, project_id)
);

create index if not exists task_activity_events_task_idx on public.task_activity_events (task_id, occurred_at desc);
create index if not exists task_activity_events_member_idx on public.task_activity_events (project_id, actor_id, occurred_at desc);
create index if not exists assignment_decisions_project_idx on public.assignment_decisions (project_id, created_at desc);
create index if not exists member_activity_daily_project_idx on public.member_activity_daily (project_id, activity_date desc);

alter table public.task_activity_events enable row level security;
alter table public.assignment_decisions enable row level security;
alter table public.agent_runs enable row level security;
alter table public.member_activity_daily enable row level security;
alter table public.member_ai_preferences enable row level security;

drop policy if exists "Project PMs can create AI summaries" on public.ai_summaries;
create policy "Project PMs can create AI summaries"
  on public.ai_summaries for insert
  to authenticated
  with check (public.is_project_pm(project_id));

drop policy if exists "Project members can read task activity" on public.task_activity_events;
create policy "Project members can read task activity" on public.task_activity_events for select to authenticated using (public.is_project_member(project_id));
drop policy if exists "Project members can read assignment decisions" on public.assignment_decisions;
create policy "Project members can read assignment decisions" on public.assignment_decisions for select to authenticated using (public.is_project_member(project_id));
drop policy if exists "Project members can read agent runs" on public.agent_runs;
create policy "Project members can read agent runs" on public.agent_runs for select to authenticated using (project_id is null or public.is_project_member(project_id));
drop policy if exists "Project members can read activity aggregates" on public.member_activity_daily;
create policy "Project members can read activity aggregates" on public.member_activity_daily for select to authenticated using (public.is_project_member(project_id));
drop policy if exists "PMs can write activity aggregates" on public.member_activity_daily;
create policy "PMs can write activity aggregates" on public.member_activity_daily for all to authenticated using (public.is_project_pm(project_id)) with check (public.is_project_pm(project_id));
drop policy if exists "Users can manage own AI preferences" on public.member_ai_preferences;
create policy "Users can manage own AI preferences" on public.member_ai_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_project_member(project_id));

drop policy if exists "PMs can insert task activity" on public.task_activity_events;
drop policy if exists "Project members can insert own task activity" on public.task_activity_events;
create policy "Project members can insert own task activity"
  on public.task_activity_events for insert to authenticated
  with check (actor_id = auth.uid() and public.is_project_member(project_id));
drop policy if exists "PMs can insert assignment decisions" on public.assignment_decisions;
create policy "PMs can insert assignment decisions" on public.assignment_decisions for insert to authenticated with check (public.is_project_pm(project_id));
drop policy if exists "Members can insert own assignment decisions" on public.assignment_decisions;
create policy "Members can insert own assignment decisions"
  on public.assignment_decisions for insert to authenticated
  with check (actor_id = auth.uid() and public.is_project_member(project_id));
drop policy if exists "PMs can insert agent runs" on public.agent_runs;
create policy "PMs can insert agent runs" on public.agent_runs for insert to authenticated with check (project_id is null or public.is_project_pm(project_id));

notify pgrst, 'reload schema';
