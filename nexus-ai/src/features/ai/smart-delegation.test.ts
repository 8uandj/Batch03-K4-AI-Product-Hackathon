import assert from "node:assert/strict";
import test from "node:test";

import { aggregateDelegationRisk, buildDelegationCandidates } from "./smart-delegation.ts";

const now = new Date("2026-08-01T12:00:00.000Z");

test("aggregate workload risk respects behavioral opt-out and late-night opt-out", () => {
  const rows = [{ user_id: "u1", activity_date: "2026-07-31", open_tasks: 8, doing_tasks: 4, overdue_tasks: 4, stale_doing_tasks: 2, reminder_count: 4, completed_tasks: 0, late_night_updates: 5 }];
  assert.equal(aggregateDelegationRisk(rows, false, true, now).score, 0);
  const withoutLateNight = aggregateDelegationRisk(rows, true, false, now);
  const withLateNight = aggregateDelegationRisk(rows, true, true, now);
  assert.equal(withoutLateNight.windowDays, 7);
  assert.ok(withLateNight.score >= withoutLateNight.score);
});

test("smart delegation uses behavioral risk and history instead of fixed values", () => {
  const result = buildDelegationCandidates({
    members: [
      { id: "overloaded", name: "A", skills: ["UI"], eqAnswers: { q2_taskPreference: "B" } },
      { id: "available", name: "B", skills: ["UI"], eqAnswers: { q2_taskPreference: "B" } },
    ],
    tasks: [
      { assignee_id: "overloaded", status: "doing", priority: "high", due_at: "2026-07-20T00:00:00.000Z", updated_at: "2026-07-25T00:00:00.000Z" },
      { assignee_id: "overloaded", status: "done", priority: "medium", due_at: null, updated_at: "2026-07-20T00:00:00.000Z" },
      { assignee_id: "available", status: "done", priority: "medium", due_at: null, updated_at: "2026-07-20T00:00:00.000Z" },
    ],
    dailyRows: [{ user_id: "overloaded", activity_date: "2026-07-31", open_tasks: 8, doing_tasks: 4, overdue_tasks: 4, stale_doing_tasks: 2, reminder_count: 4, completed_tasks: 0, late_night_updates: 3 }],
    privacy: [{ user_id: "overloaded", behavioral_insights_enabled: true, late_night_signal_enabled: true }, { user_id: "available", behavioral_insights_enabled: true, late_night_signal_enabled: true }],
    requiredSkills: ["UI"],
    urgent: false,
    dueAt: null,
    deadlineAt: "2026-08-20T00:00:00.000Z",
    now,
  });
  assert.equal(result.phase, "sprint");
  assert.equal(result.weights.capacity, 35);
  assert.ok(result.candidates.find((candidate) => candidate.userId === "overloaded")!.behavioralRiskScore > 0);
  assert.equal(result.candidates[0].userId, "available");
});
