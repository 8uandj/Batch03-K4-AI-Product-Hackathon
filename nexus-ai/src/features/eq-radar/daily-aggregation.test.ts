import assert from "node:assert/strict";
import test from "node:test";

import { buildDailyActivityAggregate } from "./daily-aggregation.ts";

test("daily aggregation is deterministic, timezone-aware and privacy-safe", () => {
  const now = new Date("2026-08-01T00:30:00.000Z");
  const result = buildDailyActivityAggregate({
    now,
    timeZone: "Asia/Ho_Chi_Minh",
    lateNightEnabled: true,
    reminderCount: 2,
    tasks: [
      { status: "doing", due_at: "2026-07-31T00:00:00.000Z", updated_at: "2026-07-31T16:30:00.000Z" },
      { status: "done", due_at: null, updated_at: "2026-07-31T17:00:00.000Z" },
    ],
  });
  assert.equal(result.activity_date, "2026-08-01");
  assert.equal(result.open_tasks, 1);
  assert.equal(result.doing_tasks, 1);
  assert.equal(result.overdue_tasks, 1);
  assert.equal(result.reminder_count, 2);
  assert.equal(result.late_night_updates, 2);
});

test("late-night opt-out removes only that aggregate signal", () => {
  const result = buildDailyActivityAggregate({
    now: new Date("2026-08-01T00:30:00.000Z"),
    timeZone: "Asia/Ho_Chi_Minh",
    lateNightEnabled: false,
    tasks: [{ status: "doing", due_at: null, updated_at: "2026-07-31T18:00:00.000Z" }],
  });
  assert.equal(result.open_tasks, 1);
  assert.equal(result.late_night_updates, 0);
});
