import assert from "node:assert/strict";
import test from "node:test";

import { filterKanbanTasksByScope } from "./scope.ts";
import {
  applyKanbanTaskStatusSnapshot,
  applyKanbanTaskStatusUpdate,
} from "./sync.ts";
import type { KanbanTask } from "./types.ts";

function task(id: string, assigneeId: string, status: KanbanTask["status"]) {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    status,
    priority: "medium" as const,
    assigneeId,
    assigneeName: assigneeId,
    assigneeAvatarUrl: null,
    requiredSkills: [],
    dueAt: null,
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:00:00.000Z",
  };
}

const initialTasks: KanbanTask[] = [
  task("member-task", "member-1", "todo"),
  task("pm-task", "pm-1", "doing"),
];

test("PM Team board nhận trạng thái mới từ phiên member", () => {
  const synced = applyKanbanTaskStatusUpdate(initialTasks, {
    id: "member-task",
    status: "doing",
    updatedAt: "2026-08-01T00:00:00.000Z",
  });

  assert.equal(synced.find((item) => item.id === "member-task")?.status, "doing");
  assert.equal(
    synced.find((item) => item.id === "member-task")?.updatedAt,
    "2026-08-01T00:00:00.000Z",
  );
});

test("member nhận trạng thái Rework do PM cập nhật qua realtime", () => {
  const synced = applyKanbanTaskStatusUpdate(initialTasks, {
    id: "member-task",
    status: "rework",
    updatedAt: "2026-08-01T01:00:00.000Z",
  });

  assert.equal(
    synced.find((item) => item.id === "member-task")?.status,
    "rework",
  );
});

test("Personal board của member dùng cùng trạng thái đã đồng bộ", () => {
  const synced = applyKanbanTaskStatusUpdate(initialTasks, {
    id: "member-task",
    status: "done",
  });
  const personalTasks = filterKanbanTasksByScope(
    synced,
    "personal",
    "member-1",
  );

  assert.equal(personalTasks.length, 1);
  assert.equal(personalTasks[0]?.status, "done");
});

test("bỏ qua payload realtime không hợp lệ hoặc task ngoài board", () => {
  assert.equal(
    applyKanbanTaskStatusUpdate(initialTasks, {
      id: "member-task",
      status: "blocked",
    }),
    initialTasks,
  );
  assert.equal(
    applyKanbanTaskStatusUpdate(initialTasks, {
      id: "other-project-task",
      status: "done",
    }),
    initialTasks,
  );
});

test("snapshot phục hồi sự kiện bị lỡ nhưng không ghi đè bằng dữ liệu cũ", () => {
  const recovered = applyKanbanTaskStatusSnapshot(initialTasks, [
    {
      id: "member-task",
      status: "doing",
      updatedAt: "2026-08-01T00:00:00.000Z",
    },
  ]);
  const staleUpdate = applyKanbanTaskStatusUpdate(recovered, {
    id: "member-task",
    status: "todo",
    updatedAt: "2026-07-30T00:00:00.000Z",
  });

  assert.equal(
    staleUpdate.find((item) => item.id === "member-task")?.status,
    "doing",
  );
});
