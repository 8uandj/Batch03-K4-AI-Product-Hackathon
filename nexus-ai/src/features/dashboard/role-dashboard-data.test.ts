import test from "node:test";
import assert from "node:assert/strict";

import { calculateAdHocMetrics } from "./ad-hoc.ts";
import { buildDashboardSuggestions, calculateAssignmentConcentration } from "./role-dashboard-data.ts";

test("ad-hoc forecast uses effort size, not only task count", () => {
  const result = calculateAdHocMetrics([
    { origin: "ai_planned", effort_size: "small" },
    { origin: "ad_hoc", effort_size: "large" },
  ] as never);

  assert.equal(result.adHocRatio, 50);
  assert.equal(result.adHocEffortRatio, 75);
  assert.equal(result.forecastAlert, true);
});

test("ad-hoc forecast excludes completed work from remaining effort", () => {
  const result = calculateAdHocMetrics([
    { status: "done", origin: "ad_hoc", effort_size: "large" },
    { status: "todo", origin: "ai_planned", effort_size: "small" },
    { status: "doing", origin: "rework", effort_size: "large" },
  ]);

  assert.equal(result.planned, 1);
  assert.equal(result.adHoc, 0);
  assert.equal(result.rework, 1);
  assert.equal(result.adHocEffortRatio, 75);
  assert.equal(result.forecastAlert, true);
});

test("assignment concentration excludes done tasks and reports shares", () => {
  const result = calculateAssignmentConcentration([
    { id: "1", title: "A", projectId: "p", projectName: "P", status: "doing", priority: "high", assigneeId: "u1", assigneeName: "A", updatedAt: "", dueAt: null, delayHours: 0, overdue: false },
    { id: "2", title: "B", projectId: "p", projectName: "P", status: "todo", priority: "low", assigneeId: "u1", assigneeName: "A", updatedAt: "", dueAt: null, delayHours: 0, overdue: false },
    { id: "3", title: "C", projectId: "p", projectName: "P", status: "done", priority: "low", assigneeId: "u2", assigneeName: "B", updatedAt: "", dueAt: null, delayHours: 0, overdue: false },
  ]);
  assert.deepEqual(result[0], { userId: "u1", name: "A", openTasks: 2, sharePercentage: 100 });
});

test("dashboard forecast suggestions carry evidence, time window, confidence and action", () => {
  const suggestions = buildDashboardSuggestions(
    { planned: 8, adHoc: 3, rework: 1, adHocRatio: 33, adHocEffortRatio: 42, forecastAlert: true },
    [{ userId: "u1", name: "A", openTasks: 8, sharePercentage: 67 }],
    2,
    [{ id: "r1", type: "overload", severity: "high", summary: "Risk", ownerName: "A", createdAt: "2026-08-01T00:00:00Z" }],
  );
  assert.equal(suggestions.length, 4);
  for (const suggestion of suggestions) {
    assert.ok(suggestion.evidence.length > 0);
    assert.ok(suggestion.timeWindow.length > 0);
    assert.ok(["low", "medium", "high"].includes(suggestion.confidence));
    assert.ok(suggestion.suggestedAction.length > 0);
  }
});
