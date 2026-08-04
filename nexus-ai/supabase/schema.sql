create extension if not exists vector;
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table public.users (
  id uuid primary key default uuid_generate_v4(),
  name text,
  skills text[] not null default '{}',
  eq_answers jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id uuid not null references public.users(id),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  deadline_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);


create table public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('pm', 'member')),
  joined_at timestamp with time zone not null default now(),
  primary key (project_id, user_id)
);

create table public.project_invites (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('pm', 'member')),
  token text not null unique default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'pending'
    check (status in ('pending', 'awaiting_approval', 'accepted', 'revoked', 'expired')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_id uuid not null default gen_random_uuid(),
  filename text not null default 'untitled',
  chunk_index integer not null default 0 check (chunk_index >= 0),
  content text not null check (length(content) > 0),
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  unique (source_id, chunk_index)
);

create or replace function public.match_documents(
  query_embedding vector(1536),
  filter_project_id uuid,
  match_threshold float default 0.35,
  match_count integer default 5
)
returns table (
  id uuid,
  filename text,
  chunk_index integer,
  content text,
  similarity float
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    if auth.uid() is null then
      raise exception 'Authentication required' using errcode = '42501';
    end if;
    if not public.is_project_member(filter_project_id) then
      raise exception 'Project membership required' using errcode = '42501';
    end if;
  end if;

  return query
  select
    documents.id,
    documents.filename,
    documents.chunk_index,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from public.documents
  where documents.project_id = filter_project_id
    and 1 - (documents.embedding <=> query_embedding) >= match_threshold
  order by documents.embedding <=> query_embedding
  limit least(match_count, 20);
end;
$$;

revoke all on function public.match_documents(vector, uuid, double precision, integer) from public;
grant execute on function public.match_documents(vector, uuid, double precision, integer) to authenticated, service_role;

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'doing', 'rework', 'done')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  assignee_id uuid not null references public.users(id),
  required_skills text[] not null default '{}',
  due_at timestamp with time zone,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);

create table public.chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('team', 'bot')),
  name text not null,
  created_at timestamp with time zone not null default now(),
  unique (project_id, type)
);

create table public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid references public.users(id),
  sender_type text not null default 'user'
    check (sender_type in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.ai_summaries (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('project_brief', 'member_insight', 'team_health')),
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table public.ai_recommendations (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('task_assignment', 'coaching', 'conflict_resolution')),
  target_user_id uuid references public.users(id),
  title text not null,
  rationale text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'suggested'
    check (status in ('suggested', 'accepted', 'dismissed')),
  created_at timestamp with time zone not null default now()
);

create table public.risk_events (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid references public.users(id),
  task_id uuid references public.tasks(id) on delete set null,
  type text not null check (type in ('overdue', 'overload', 'conflict', 'burnout_signal')),
  severity text not null default 'medium'
    check (severity in ('low', 'medium', 'high')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table public.deadline_notifications (
  id uuid primary key default uuid_generate_v4(),
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

alter table public.deadline_notifications enable row level security;

create policy "Users can read own deadline notifications"
  on public.deadline_notifications for select
  to authenticated
  using (recipient_user_id = auth.uid());

create policy "Users can mark own deadline notifications read"
  on public.deadline_notifications for update
  to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

create index projects_owner_id_idx on public.projects (owner_id);
create index project_members_user_id_idx on public.project_members (user_id);
create index documents_project_id_idx on public.documents (project_id);
create index documents_embedding_hnsw_idx
  on public.documents using hnsw (embedding vector_cosine_ops);
create index tasks_project_id_idx on public.tasks (project_id);
create index tasks_assignee_id_idx on public.tasks (assignee_id);
create index tasks_project_id_status_idx on public.tasks (project_id, status);
create index chat_rooms_project_id_idx on public.chat_rooms (project_id);
create index chat_messages_room_id_created_at_idx
  on public.chat_messages (room_id, created_at);
create index risk_events_project_id_idx on public.risk_events (project_id);
create index deadline_notifications_recipient_idx
  on public.deadline_notifications (recipient_user_id, project_id, created_at desc);
create index deadline_notifications_project_idx
  on public.deadline_notifications (project_id, created_at desc);

-- -------------------------------------------------------------------------
-- NexusAI v2 canonical extensions (kept here for fresh workspaces).
-- Existing workspaces should apply migrations 017 through 041 in order.
-- -------------------------------------------------------------------------

alter table public.projects
  add column if not exists allow_member_task_creation boolean not null default false;

alter table public.tasks
  add column if not exists origin text not null default 'ai_planned',
  add column if not exists source_type text,
  add column if not exists source_task_id uuid references public.tasks(id) on delete set null,
  add column if not exists created_by uuid references public.users(id) on delete set null,
  add column if not exists effort_size text not null default 'medium',
  add column if not exists is_urgent boolean not null default false,
  add column if not exists acceptance_criteria text,
  add column if not exists blocked_by_task_id uuid references public.tasks(id) on delete set null;

alter table public.deadline_notifications
  add column if not exists tone text not null default 'neutral',
  add column if not exists trigger_reason text not null default 'overdue',
  add column if not exists action_link text;

alter table public.deadline_notifications drop constraint if exists deadline_notifications_kind_check;
alter table public.deadline_notifications add constraint deadline_notifications_kind_check
  check (kind in ('assignee_check_in', 'leader_escalation', 'force_assign_followup', 'force_assign_warning'));
alter table public.tasks drop constraint if exists tasks_origin_check;
alter table public.tasks add constraint tasks_origin_check
  check (origin in ('ai_planned', 'manual', 'ad_hoc', 'rework'));
alter table public.tasks drop constraint if exists tasks_source_type_check;
alter table public.tasks add constraint tasks_source_type_check
  check (source_type is null or source_type in ('feedback_change', 'bug_fix', 'urgent_request', 'admin_logistics', 'other'));
alter table public.tasks drop constraint if exists tasks_effort_size_check;
alter table public.tasks add constraint tasks_effort_size_check
  check (effort_size in ('small', 'medium', 'large'));

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

create index if not exists task_activity_events_task_idx on public.task_activity_events (task_id, occurred_at desc);
create index if not exists assignment_decisions_project_idx on public.assignment_decisions (project_id, created_at desc);
create index if not exists member_activity_daily_project_idx on public.member_activity_daily (project_id, activity_date desc);
create index if not exists assignment_followups_due_idx on public.assignment_followups (status, due_at) where notified_at is null;

alter table public.task_activity_events enable row level security;
alter table public.assignment_decisions enable row level security;
alter table public.agent_runs enable row level security;
alter table public.member_activity_daily enable row level security;
alter table public.member_ai_preferences enable row level security;
alter table public.assignment_followups enable row level security;

create or replace function public.is_project_member(target_project_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.project_members pm where pm.project_id = target_project_id and pm.user_id = auth.uid());
$$;
create or replace function public.is_project_pm(target_project_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.project_members pm where pm.project_id = target_project_id and pm.user_id = auth.uid() and pm.role = 'pm');
$$;

create or replace function public.record_risk_event(
  target_project_id uuid,
  target_user_id uuid,
  target_task_id uuid default null,
  event_type text default 'overload',
  event_severity text default 'medium',
  event_summary text default '',
  event_metadata jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  existing_id uuid;
  created_id uuid;
  stored_summary text := event_summary;
  stored_metadata jsonb := coalesce(event_metadata, '{}'::jsonb);
begin
  if auth.uid() is null or not public.is_project_member(target_project_id) then
    raise exception 'Project membership required' using errcode = '42501';
  end if;
  if target_user_id is not null and not exists (select 1 from public.project_members where project_id = target_project_id and user_id = target_user_id) then
    raise exception 'Risk event user must belong to project' using errcode = '23514';
  end if;
  if target_task_id is not null and not exists (select 1 from public.tasks where id = target_task_id and project_id = target_project_id) then
    raise exception 'Risk event task must belong to project' using errcode = '23514';
  end if;
  if event_type not in ('overdue', 'overload', 'conflict', 'burnout_signal') then
    raise exception 'Invalid risk event type' using errcode = '23514';
  end if;
  if event_type = 'conflict' then
    if target_user_id is distinct from auth.uid() then
      raise exception 'Conflict events may only target the opted-in caller' using errcode = '42501';
    end if;
    if not exists (select 1 from public.member_ai_preferences where project_id = target_project_id and user_id = auth.uid() and chat_analysis_enabled = true) then
      raise exception 'Chat analysis opt-in required' using errcode = '42501';
    end if;
    stored_summary := 'Nexus phát hiện tín hiệu bất đồng trong Team Chat và đã đề xuất cách tháo gỡ.';
    stored_metadata := jsonb_build_object('source', 'opt_in_chat_analysis', 'privacy', 'derived_signal_only');
  elsif not public.is_project_pm(target_project_id) then
    raise exception 'Only project PM can record this risk event' using errcode = '42501';
  end if;
  if event_severity not in ('low', 'medium', 'high') then
    raise exception 'Invalid risk event severity' using errcode = '23514';
  end if;
  if nullif(trim(stored_summary), '') is null then
    raise exception 'Risk event summary is required' using errcode = '23514';
  end if;
  perform pg_advisory_xact_lock(hashtext(concat_ws(':', target_project_id::text, coalesce(target_user_id::text, ''), coalesce(target_task_id::text, ''), event_type)));
  select id into existing_id from public.risk_events
  where project_id = target_project_id and user_id is not distinct from target_user_id
    and task_id is not distinct from target_task_id and type = event_type
    and created_at >= now() - interval '24 hours'
  order by created_at desc limit 1;
  if existing_id is not null then return existing_id; end if;
  insert into public.risk_events (project_id, user_id, task_id, type, severity, summary, metadata)
  values (target_project_id, target_user_id, target_task_id, event_type, event_severity, left(trim(stored_summary), 1000), stored_metadata)
  returning id into created_id;
  return created_id;
end;
$$;
revoke all on function public.record_risk_event(uuid, uuid, uuid, text, text, text, jsonb) from public;
grant execute on function public.record_risk_event(uuid, uuid, uuid, text, text, text, jsonb) to authenticated;

create or replace function public.get_project_privacy_flags(target_project_id uuid)
returns table (user_id uuid, behavioral_insights_enabled boolean, late_night_signal_enabled boolean)
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_project_pm(target_project_id) then
    raise exception 'Only project PM can read team privacy flags' using errcode = '42501';
  end if;
  return query
  select members.user_id,
    coalesce(preferences.behavioral_insights_enabled, true),
    coalesce(preferences.late_night_signal_enabled, true)
  from public.project_members members
  left join public.member_ai_preferences preferences
    on preferences.project_id = members.project_id and preferences.user_id = members.user_id
  where members.project_id = target_project_id;
end;
$$;
revoke all on function public.get_project_privacy_flags(uuid) from public;
grant execute on function public.get_project_privacy_flags(uuid) to authenticated;

create or replace function public.process_assignment_followup(target_followup_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  followup public.assignment_followups%rowtype;
begin
  if coalesce(auth.jwt()->>'role', '') <> 'service_role' then
    raise exception 'Service role required' using errcode = '42501';
  end if;
  select * into followup from public.assignment_followups
  where id = target_followup_id and status = 'open' and notified_at is null and due_at <= now()
  for update skip locked;
  if not found then return false; end if;
  insert into public.deadline_notifications (
    project_id, task_id, recipient_user_id, kind, content, overdue_hours,
    notification_day, tone, trigger_reason, action_link
  ) values (
    followup.project_id, followup.task_id, followup.member_id, 'force_assign_followup',
    'Nexus kiểm tra lại task sau lần phân công có cảnh báo. Bạn có cần hỗ trợ, dời task khác hoặc giảm scope không? Phương án đã ghi nhận: ' || followup.mitigation || '.',
    0, current_date, 'urgent', 'force_assign_override',
    '/project/' || followup.project_id::text || '/board?task=' || followup.task_id::text
  ) on conflict (task_id, recipient_user_id, kind, notification_day) do nothing;
  update public.assignment_followups set notified_at = now() where id = followup.id and notified_at is null;
  return true;
end;
$$;
revoke all on function public.process_assignment_followup(uuid) from public;
grant execute on function public.process_assignment_followup(uuid) to service_role;

create or replace function public.delete_member_behavioral_data(target_project_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  aggregate_count integer;
  conflict_count integer;
begin
  if auth.uid() is null or not public.is_project_member(target_project_id) then
    raise exception 'Project membership required' using errcode = '42501';
  end if;
  delete from public.member_activity_daily where project_id = target_project_id and user_id = auth.uid();
  get diagnostics aggregate_count = row_count;
  delete from public.risk_events where project_id = target_project_id and user_id = auth.uid() and type = 'conflict';
  get diagnostics conflict_count = row_count;
  return jsonb_build_object('aggregates_deleted', aggregate_count, 'derived_conflict_events_deleted', conflict_count);
end;
$$;
revoke all on function public.delete_member_behavioral_data(uuid) from public;
grant execute on function public.delete_member_behavioral_data(uuid) to authenticated;

create or replace function public.validate_risk_event_project_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.task_id is not null and not exists (select 1 from public.tasks where id = new.task_id and project_id = new.project_id) then
    raise exception 'Risk event task does not belong to the event project';
  end if;
  if new.user_id is not null and not exists (select 1 from public.project_members where project_id = new.project_id and user_id = new.user_id) then
    raise exception 'Risk event user does not belong to the event project';
  end if;
  return new;
end;
$$;
drop trigger if exists risk_event_project_guard on public.risk_events;
create trigger risk_event_project_guard before insert or update on public.risk_events for each row execute function public.validate_risk_event_project_reference();

create or replace function public.validate_deadline_notification_project_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.tasks where id = new.task_id and project_id = new.project_id) then
    raise exception 'Notification task does not belong to the notification project';
  end if;
  if not exists (select 1 from public.project_members where project_id = new.project_id and user_id = new.recipient_user_id) then
    raise exception 'Notification recipient does not belong to the notification project';
  end if;
  return new;
end;
$$;
drop trigger if exists deadline_notification_project_guard on public.deadline_notifications;
create trigger deadline_notification_project_guard before insert or update on public.deadline_notifications for each row execute function public.validate_deadline_notification_project_reference();

create or replace function public.validate_assignment_followup_project_reference()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.tasks where id = new.task_id and project_id = new.project_id) then
    raise exception 'Follow-up task does not belong to the follow-up project';
  end if;
  if not exists (select 1 from public.project_members where project_id = new.project_id and user_id = new.member_id) then
    raise exception 'Follow-up member does not belong to the follow-up project';
  end if;
  if not exists (select 1 from public.project_members where project_id = new.project_id and user_id = new.created_by) then
    raise exception 'Follow-up creator does not belong to the follow-up project';
  end if;
  return new;
end;
$$;
drop trigger if exists assignment_followup_project_guard on public.assignment_followups;
create trigger assignment_followup_project_guard before insert or update on public.assignment_followups for each row execute function public.validate_assignment_followup_project_reference();

drop policy if exists "Project members can read risk events" on public.risk_events;
drop policy if exists "PMs can read risk events" on public.risk_events;
create policy "PMs can read risk events"
  on public.risk_events for select to authenticated using (public.is_project_pm(project_id));

create policy "Project members can read task activity"
  on public.task_activity_events for select to authenticated using (public.is_project_member(project_id));
create policy "PMs can read assignment decisions"
  on public.assignment_decisions for select to authenticated using (public.is_project_pm(project_id));
create policy "PMs can read project agent runs"
  on public.agent_runs for select to authenticated using (project_id is not null and public.is_project_pm(project_id));
create policy "PMs can read team activity aggregates"
  on public.member_activity_daily for select to authenticated using (public.is_project_pm(project_id));
create policy "Members can read own activity aggregates"
  on public.member_activity_daily for select to authenticated using (user_id = auth.uid() and public.is_project_member(project_id));
create policy "Users can manage own AI preferences"
  on public.member_ai_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid() and public.is_project_member(project_id));
create policy "Project members can read own assignment followups"
  on public.assignment_followups for select to authenticated using (member_id = auth.uid() or public.is_project_pm(project_id));

-- The transaction RPCs and extended isolation guards are deliberately kept in migrations 020, 025, 026, 027 and 042 and
-- 027 so fresh-schema setup and upgrade setup share the same reviewed SQL.
