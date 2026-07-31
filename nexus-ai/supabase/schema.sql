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
  token text not null unique default encode(gen_random_bytes(24), 'hex'),
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
language sql
stable
as $$
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
$$;

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo'
    check (status in ('todo', 'doing', 'done')),
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
