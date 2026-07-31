# Nexus AI API Contracts

Tai lieu nay la contract chung de cac feature lam song song ma khong lech schema.

## Core tables

### `users`

Ho so thanh vien sau Auth/Onboarding.

- `id`: uuid
- `name`: text nullable
- `skills`: text[]
- `eq_answers`: jsonb
- `created_at`: timestamptz

### `projects`

Du an do PM tao.

- `id`: uuid
- `name`: text
- `description`: text nullable
- `owner_id`: uuid -> `users.id`
- `status`: `active | archived`
- `created_at`, `updated_at`: timestamptz

### `project_members`

Thanh vien thuoc du an.

- `project_id`: uuid -> `projects.id`
- `user_id`: uuid -> `users.id`
- `role`: `pm | member`
- `joined_at`: timestamptz

### `project_invites`

Hang doi invite thanh vien.

- `id`: uuid
- `project_id`: uuid -> `projects.id`
- `email`: text
- `role`: `pm | member`
- `token`: text unique
- `status`: `pending | accepted | revoked | expired`
- `expires_at`: timestamptz nullable
- `created_at`: timestamptz

## RAG contracts

### `documents`

Tai lieu duoc chunk va gan theo project.

- `id`: uuid
- `project_id`: uuid -> `projects.id`
- `source_id`: uuid, gom cac chunk cua cung mot file
- `filename`: text
- `chunk_index`: integer
- `content`: text
- `embedding`: vector(1536)
- `metadata`: jsonb
- `created_at`: timestamptz

### RPC `match_documents`

```ts
await supabase.rpc('match_documents', {
  query_embedding: number[],
  filter_project_id: projectId,
  match_threshold: 0.35,
  match_count: 5,
});
```

Tra ve:

```ts
Array<{
  id: string;
  filename: string;
  chunk_index: number;
  content: string;
  similarity: number;
}>;
```

## Task/Kanban contracts

### `tasks`

- `id`: uuid
- `project_id`: uuid nullable -> `projects.id`
- `title`: text
- `description`: text nullable
- `status`: `todo | doing | done`
- `priority`: `low | medium | high`
- `assignee_id`: uuid -> `users.id`
- `due_at`: timestamptz nullable
- `updated_at`, `created_at`: timestamptz

## Chat contracts

### `chat_rooms`

Moi project co 2 room chinh:

- `team`: thanh vien chat voi nhau, AI co the can thiep khi conflict ro.
- `bot`: hoi dap voi Nexus Knowledge Bot/RAG.

Fields:

- `id`: uuid
- `project_id`: uuid -> `projects.id`
- `type`: `team | bot`
- `name`: text
- `created_at`: timestamptz

### `chat_messages`

- `id`: uuid
- `room_id`: uuid -> `chat_rooms.id`
- `sender_id`: uuid nullable -> `users.id`
- `sender_type`: `user | assistant | system`
- `content`: text
- `metadata`: jsonb
- `created_at`: timestamptz

## AI insight contracts

### `ai_summaries`

Dung cho project brief, member insight va team health summary.

- `type`: `project_brief | member_insight | team_health`
- `title`: text
- `content`: text
- `metadata`: jsonb

### `ai_recommendations`

Dung cho goi y chia task, coaching, xu ly conflict.

- `type`: `task_assignment | coaching | conflict_resolution`
- `target_user_id`: uuid nullable
- `title`: text
- `rationale`: text
- `payload`: jsonb
- `status`: `suggested | accepted | dismissed`

### `risk_events`

Tin hieu cho PM Dashboard/EQ Radar.

- `type`: `overdue | overload | conflict | burnout_signal`
- `severity`: `low | medium | high`
- `summary`: text
- `metadata`: jsonb
- `resolved_at`: timestamptz nullable

## Route ownership

- `/project/[id]`: project overview shell, PM/infra owned.
- `/project/[id]/chat`: chat space selector, PM/infra owned.
- `/project/[id]/chat/team`: Team Chat shell/mock, chat feature owner can extend.
- `/project/[id]/chat/bot`: Bot Chat/RAG, document-rag owner.
- `/project/[id]/board`: Kanban owner.
- `/pm-dashboard`: Dashboard/EQ Radar owner.
