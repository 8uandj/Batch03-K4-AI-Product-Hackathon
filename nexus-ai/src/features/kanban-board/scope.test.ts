import assert from "node:assert/strict";
import test from "node:test";

import { filterKanbanTasksByScope } from "./scope.ts";
import type { KanbanTask } from "./types.ts";

function task(id: string, assigneeId: string): KanbanTask {
  return {
    id,
    title: `Task ${id}`,
    description: null,
    status: "todo",
    priority: "medium",
    assigneeId,
    assigneeName: assigneeId,
    assigneeAvatarUrl: null,
    requiredSkills: [],
    dueAt: null,
    createdAt: "2026-07-31T00:00:00.000Z",
    updatedAt: "2026-07-31T00:00:00.000Z",
  };
}

const tasks = [
  task("task-1", "member-current"),
  task("task-2", "member-other"),
  task("task-3", "member-current"),
];

test("Personal board chỉ trả về task của user đang đăng nhập", () => {
  assert.deepEqual(
    filterKanbanTasksByScope(tasks, "personal", "member-current").map(
      (item) => item.id,
    ),
    ["task-1", "task-3"],
  );
});

test("Team board trả về toàn bộ task của project", () => {
  assert.equal(
    filterKanbanTasksByScope(tasks, "team", "member-current").length,
    3,
  );
});

test("Personal board hiển thị rỗng khi user chưa được giao task", () => {
  assert.deepEqual(
    filterKanbanTasksByScope(tasks, "personal", "member-without-task"),
    [],
  );
});
