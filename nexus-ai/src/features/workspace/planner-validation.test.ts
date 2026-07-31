import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlannerDocumentContext,
  PlannerValidationError,
  validatePlannerTasks,
} from "./planner-validation.ts";

const validTask = {
  title: "Xây dựng API",
  description: "Hoàn thiện API contract.",
  priority: "high",
  assignee_id: "member-1",
  required_skills: ["API", "API", ""],
  due_in_days: 3,
};

test("chuẩn hóa task hợp lệ và loại kỹ năng rỗng", () => {
  const [task] = validatePlannerTasks([validTask], ["member-1"], {
    maxDueDays: 7,
  });

  assert.equal(task.title, "Xây dựng API");
  assert.deepEqual(task.required_skills, ["API"]);
});

test("từ chối assignee không thuộc project", () => {
  assert.throws(
    () => validatePlannerTasks([validTask], ["member-2"]),
    (error: unknown) =>
      error instanceof PlannerValidationError &&
      error.message.includes("không thuộc project"),
  );
});

test("từ chối deadline vượt deadline dự án", () => {
  assert.throws(
    () =>
      validatePlannerTasks(
        [{ ...validTask, due_in_days: 8 }],
        ["member-1"],
        { maxDueDays: 7 },
      ),
    PlannerValidationError,
  );
});

test("từ chối kế hoạch rỗng hoặc quá nhiều task", () => {
  assert.throws(() => validatePlannerTasks([], ["member-1"]), PlannerValidationError);
  assert.throws(
    () => validatePlannerTasks([validTask, validTask], ["member-1"], { maxTasks: 1 }),
    PlannerValidationError,
  );
});

test("dùng document chunks khi project chưa có AI summary", () => {
  const context = buildPlannerDocumentContext(
    null,
    [
      { filename: "brief.md", content: "Mục tiêu và phạm vi dự án" },
      { filename: "api.md", content: "API contract" },
    ],
    "fallback",
  );

  assert.match(context, /\[brief.md\]/);
  assert.match(context, /API contract/);
  assert.equal(
    buildPlannerDocumentContext("Summary mới", [], "fallback"),
    "Summary mới",
  );
});
