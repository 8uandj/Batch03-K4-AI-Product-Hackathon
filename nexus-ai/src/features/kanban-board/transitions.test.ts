import assert from "node:assert/strict";
import test from "node:test";

import { validateKanbanTransition } from "./transitions.ts";

test("PM được chuyển task từ Done sang Rework", () => {
  assert.deepEqual(
    validateKanbanTransition({
      canManageRework: true,
      currentStatus: "done",
      nextStatus: "rework",
    }),
    { allowed: true },
  );
});

test("không cho đưa task chưa Done vào Rework", () => {
  const decision = validateKanbanTransition({
    canManageRework: true,
    currentStatus: "doing",
    nextStatus: "rework",
  });

  assert.equal(decision.allowed, false);
  if (!decision.allowed) assert.equal(decision.code, "done_required");
});

test("member không được đưa task vào hoặc kéo task ra khỏi Rework", () => {
  for (const [currentStatus, nextStatus] of [
    ["done", "rework"],
    ["rework", "doing"],
  ] as const) {
    const decision = validateKanbanTransition({
      canManageRework: false,
      currentStatus,
      nextStatus,
    });

    assert.equal(decision.allowed, false);
    if (!decision.allowed) assert.equal(decision.code, "pm_required");
  }
});

test("member vẫn được cập nhật các trạng thái thông thường", () => {
  assert.deepEqual(
    validateKanbanTransition({
      canManageRework: false,
      currentStatus: "todo",
      nextStatus: "doing",
    }),
    { allowed: true },
  );
});
