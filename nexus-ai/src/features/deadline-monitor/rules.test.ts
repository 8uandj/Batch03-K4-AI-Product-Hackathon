import assert from "node:assert/strict";
import test from "node:test";

import {
  dateInTimeZone,
  formatOverdueDuration,
  getOverdueHours,
  planDeadlineNotifications,
  type DeadlineTaskSnapshot,
} from "./rules.ts";

const NOW = new Date("2026-08-01T08:00:00.000Z");

function task(overrides: Partial<DeadlineTaskSnapshot> = {}): DeadlineTaskSnapshot {
  return {
    id: "task-1",
    projectId: "project-1",
    title: "Hoàn thiện Kanban",
    status: "doing",
    assigneeId: "member-1",
    assigneeName: "Vinh",
    dueAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

test("task chưa trễ hoặc đã done không tạo follow-up", () => {
  assert.equal(
    getOverdueHours(task({ dueAt: "2026-08-02T00:00:00.000Z" }), NOW),
    null,
  );
  assert.equal(getOverdueHours(task({ status: "done" }), NOW), null);
});

test("task vừa trễ chỉ hỏi thăm riêng assignee", () => {
  const result = planDeadlineNotifications({
    task: task(),
    leaderIds: ["pm-1"],
    now: NOW,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.kind, "assignee_check_in");
  assert.equal(result[0]?.recipientUserId, "member-1");
  assert.match(result[0]?.content ?? "", /chỉ hiển thị với bạn/);
});

test("task trễ đủ 48 giờ vừa hỏi assignee vừa cảnh báo mọi PM", () => {
  const result = planDeadlineNotifications({
    task: task({ dueAt: "2026-07-30T08:00:00.000Z" }),
    leaderIds: ["pm-1", "pm-2", "pm-1"],
    now: NOW,
  });

  assert.equal(result.length, 3);
  assert.equal(
    result.filter((notification) => notification.kind === "leader_escalation")
      .length,
    2,
  );
  assert.match(result[1]?.content ?? "", /kiểm tra blocker/);
});

test("format thời gian trễ và ngày quét theo múi giờ Việt Nam", () => {
  assert.equal(formatOverdueDuration(5), "5 giờ");
  assert.equal(formatOverdueDuration(49), "2 ngày 1 giờ");
  assert.equal(dateInTimeZone(new Date("2026-07-31T18:00:00.000Z")), "2026-08-01");
});
