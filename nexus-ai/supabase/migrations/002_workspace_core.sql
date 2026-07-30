create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  owner_id uuid not null references public.users(id),
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member'
    check (role in ('pm', 'member')),
  joined_at timestamp with time zone not null default now(),
  primary key (project_id, user_id)
);

create table if not exists public.project_invites (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  email text not null,
  role text not null default 'member'
    check (role in ('pm', 'member')),
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

alter table public.documents
  add column if not exists project_id uuid,
  add column if not exists source_id uuid not null default gen_random_uuid(),
  add column if not exists filename text not null default 'untitled',
  add column if not exists chunk_index integer not null default 0,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.tasks
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists description text,
  add column if not exists priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  add column if not exists due_at timestamp with time zone;

create table if not exists public.chat_rooms (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('team', 'bot')),
  name text not null,
  created_at timestamp with time zone not null default now(),
  unique (project_id, type)
);

create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid references public.users(id),
  sender_type text not null default 'user'
    check (sender_type in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.ai_summaries (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('project_brief', 'member_insight', 'team_health')),
  title text not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.ai_recommendations (
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

create table if not exists public.risk_events (
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

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists project_members_user_id_idx on public.project_members (user_id);
create index if not exists documents_project_id_idx on public.documents (project_id);
create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists chat_rooms_project_id_idx on public.chat_rooms (project_id);
create index if not exists chat_messages_room_id_created_at_idx
  on public.chat_messages (room_id, created_at);
create index if not exists risk_events_project_id_idx on public.risk_events (project_id);

notify pgrst, 'reload schema';
