# Kanban Board · DEV 3

Module Workflow & Automation của Nexus AI.

## Chức năng

- Board ba cột `todo`, `doing`, `done`.
- Kéo thả bằng `dnd-kit`, cập nhật UI optimistic và rollback khi API lỗi.
- Card hiển thị priority, skill tags, assignee avatar và deadline.
- Demo `/project/demo/board` dùng mock state, không ghi database.
- Project thật đọc/ghi Supabase theo project membership và RLS.
- AI Auto-Tasking nhận `users + documentSummary`, dùng OpenAI structured
  output, gán assignee hợp lệ và bulk insert vào `tasks`.
- Nếu thiếu OpenAI key hoặc provider lỗi, API dùng mock generator có cảnh báo
  rõ ràng để demo không bị gián đoạn.

## API

### `PATCH /api/projects/:projectId/tasks/:taskId`

```json
{
  "status": "doing"
}
```

### `POST /api/projects/:projectId/tasks/auto`

```json
{
  "users": [
    {
      "id": "uuid",
      "name": "Vinh",
      "skills": ["TypeScript", "dnd-kit"]
    }
  ],
  "documentSummary": "Mô tả và yêu cầu của project...",
  "taskCount": 6
}
```

Project thật yêu cầu người gọi là PM. Danh sách user trong request được đối
chiếu lại với `project_members` trước khi ghi task.

## Database

Chạy migration:

```text
supabase/migrations/008_kanban_workflow.sql
```

Migration bổ sung `tasks.required_skills` và trigger cập nhật `updated_at`.
