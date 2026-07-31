import assert from "node:assert/strict";
import test from "node:test";

import { validateKanbanTransition } from "./transitions.ts";

test("PM được chuyển task từ Done sang Rework", () => {
  assert.deepEqual(
    validateKanbanTransition({
      currentStatus: "done",
      nextStatus: "rework",
      role: "pm",
    }),
    { allowed: true },
  );
});

test("PM không được đưa task chưa Done vào Rework", () => {
  const result = validateKanbanTransition({
    currentStatus: "doing",
    nextStatus: "rework",
    role: "pm",
  });

  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "done_required");
});

test("member không được đưa task vào hoặc kéo task ra khỏi Rework", () => {
  for (const [currentStatus, nextStatus] of [
    ["done", "rework"],
    ["rework", "doing"],
  ] as const) {
    const result = validateKanbanTransition({
      currentStatus,
      nextStatus,
      role: "member",
    });

    assert.equal(result.allowed, false);
    if (!result.allowed) assert.equal(result.code, "pm_required");
  }
});
