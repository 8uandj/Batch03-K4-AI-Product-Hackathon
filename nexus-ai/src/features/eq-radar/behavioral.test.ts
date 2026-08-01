import test from "node:test";
import assert from "node:assert/strict";

import { aggregateBehavioralWindows, calculateBehavioralRisk } from "./behavioral.ts";

test("behavioral risk applies the documented weighted score", () => {
  const now = new Date("2026-08-01T08:00:00.000Z");
  const result = calculateBehavioralRisk(Array.from({ length: 8 }, (_, index) => ({
    status: "doing",
    due_at: new Date(now.getTime() - 86400000).toISOString(),
    updated_at: new Date(now.getTime() - 72 * 3600000).toISOString(),
    priority: index < 2 ? "high" : "medium",
  })), now);

  assert.equal(result.score, 79);
  assert.equal(result.level, "high");
});

test("privacy-friendly low activity remains low risk", () => {
  const result = calculateBehavioralRisk([
    { status: "done", due_at: null, updated_at: new Date().toISOString(), priority: "low" },
  ], new Date(), { lateNightEnabled: false });

  assert.equal(result.score, 0);
  assert.equal(result.level, "low");
});

test("behavioral windows aggregate both 7 and 30 day evidence", () => {
  const now = new Date("2026-08-01T08:00:00.000Z");
  const windows = aggregateBehavioralWindows([
    { activity_date: "2026-07-31", open_tasks: 4, doing_tasks: 2, overdue_tasks: 1, stale_doing_tasks: 1, reminder_count: 2, completed_tasks: 1, late_night_updates: 3 },
    { activity_date: "2026-07-05", open_tasks: 2, doing_tasks: 1, overdue_tasks: 0, stale_doing_tasks: 0, reminder_count: 1, completed_tasks: 2, late_night_updates: 1 },
  ], now);
  assert.equal(windows[0]?.daysObserved, 1);
  assert.equal(windows[0]?.reminderCount, 2);
  assert.equal(windows[1]?.daysObserved, 2);
  assert.equal(windows[1]?.lateNightUpdates, 4);
});

test("behavioral risk ignores task activity outside the selected evidence window", () => {
  const now = new Date("2026-08-01T08:00:00.000Z");
  const result = calculateBehavioralRisk([
    { status: "doing", due_at: "2026-06-01T00:00:00.000Z", updated_at: "2026-06-01T00:00:00.000Z", priority: "high" },
    { status: "done", due_at: null, updated_at: "2026-07-31T00:00:00.000Z", priority: "low" },
  ], now, { windowDays: 7 });
  assert.equal(result.evidence.totalTasks, 1);
  assert.equal(result.score, 0);
});
