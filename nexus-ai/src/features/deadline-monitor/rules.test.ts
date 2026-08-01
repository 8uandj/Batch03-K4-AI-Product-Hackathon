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
  assert.equal(result[0]?.tone, "gentle");
  assert.equal(result[0]?.triggerReason, "overdue");
  assert.equal(result[0]?.actionLink, "/project/project-1/board?task=task-1");
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
  assert.equal(result[1]?.tone, "urgent");
  assert.equal(result[1]?.triggerReason, "escalation");
});

test("format thời gian trễ và ngày quét theo múi giờ Việt Nam", () => {
  assert.equal(formatOverdueDuration(5), "5 giờ");
  assert.equal(formatOverdueDuration(49), "2 ngày 1 giờ");
  assert.equal(dateInTimeZone(new Date("2026-07-31T18:00:00.000Z")), "2026-08-01");
});

test("Doing quá lâu tạo coaching và escalation cho leader", () => {
  const result = planDeadlineNotifications({
    task: task({ dueAt: "2026-08-10T00:00:00.000Z", updatedAt: "2026-07-29T08:00:00.000Z" }),
    leaderIds: ["pm-1"],
    now: NOW,
  });
  assert.equal(result[0]?.triggerReason, "stale_doing");
  assert.equal(result.filter((item) => item.kind === "leader_escalation").length, 1);
  assert.match(result[0]?.content ?? "", /Doing lâu hơn/);
});

test("support request tạo blocker follow-up khẩn cấp", () => {
  const result = planDeadlineNotifications({
    task: task({ dueAt: "2026-08-10T00:00:00.000Z", supportRequested: true }),
    leaderIds: ["pm-1"],
    now: NOW,
  });
  assert.equal(result[0]?.triggerReason, "blocker");
  assert.equal(result[0]?.tone, "urgent");
  assert.equal(result[1]?.kind, "leader_escalation");
});

test("dependency chưa hoàn tất tạo cảnh báo chặn tiến độ", () => {
  const result = planDeadlineNotifications({
    task: task({ dueAt: "2026-08-10T00:00:00.000Z", dependencyBlocked: true }),
    leaderIds: ["pm-1"],
    now: NOW,
  });
  assert.equal(result[0]?.triggerReason, "dependency");
  assert.match(result[0]?.content ?? "", /dependency chưa hoàn tất/);
  assert.equal(result[1]?.kind, "leader_escalation");
});

test("workload risk giảm áp lực private reminder và tôn trọng communication preference", () => {
  const result = planDeadlineNotifications({
    task: task({
      dueAt: "2026-07-29T08:00:00.000Z",
      workloadRiskScore: 85,
      communicationPreference: "quick_call",
    }),
    leaderIds: ["pm-1"],
    now: NOW,
  });
  assert.equal(result[0]?.tone, "gentle");
  assert.match(result[0]?.content ?? "", /quick call 5–10 phút/);
  assert.equal(result[1]?.tone, "urgent");
});

test("critical workload giảm reminder lặp nhưng vẫn giữ escalation cho PM", () => {
  const notifications = planDeadlineNotifications({
    now: new Date("2026-08-01T12:00:00Z"),
    escalationHours: 48,
    leaderIds: ["pm-1"],
    task: {
      id: "task-critical",
      projectId: "project-1",
      title: "Task critical",
      status: "doing",
      assigneeId: "member-1",
      assigneeName: "Member",
      dueAt: "2026-07-29T12:00:00Z",
      updatedAt: "2026-07-29T12:00:00Z",
      workloadRiskScore: 90,
      recentReminderCount: 4,
    },
  });

  assert.equal(notifications.some((item) => item.kind === "assignee_check_in"), false);
  assert.equal(notifications.some((item) => item.kind === "leader_escalation"), true);
});
