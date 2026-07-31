import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFallbackCoaching,
  buildPersonalityAnalysis,
  buildWorkloadAnalysis,
  summarizeEqSignal,
} from "./analysis.ts";

const COMPLETE_EQ_ANSWERS = {
  q1_bugHandling: "A - Tự tìm cách gỡ một mình trước khi hỏi",
  q2_taskPreference: "B - Nhận mục tiêu lớn, tự do chủ động cách triển khai",
  q3_communication: "C - Cập nhật qua bình luận trực tiếp trên thẻ Kanban",
  q4_conflictResolution: "A - Trình bày chứng cứ/benchmark kĩ để thuyết phục nhóm",
  q5_feedbackHandling: "B - Thảo luận lại góc nhìn cá nhân trước khi quyết định refactor",
};

test("phân tích đủ 5 câu trả lời thành xu hướng có dẫn chứng", () => {
  const result = buildPersonalityAnalysis(COMPLETE_EQ_ANSWERS);

  assert.equal(result.confidence, "high");
  assert.equal(result.answeredQuestions, 5);
  assert.match(result.headline, /Tự chủ theo mục tiêu/);
  assert.match(result.communicationStyle, /Kanban/);
  assert.equal(result.evidence.length, 5);
  assert.ok(result.strengths.length >= 2);
  assert.ok(result.watchouts.some((item) => item.includes("blocker muộn")));
});

test("không suy diễn tính cách khi thiếu dữ liệu onboarding", () => {
  const result = buildPersonalityAnalysis({});

  assert.equal(result.confidence, "low");
  assert.equal(result.answeredQuestions, 0);
  assert.match(result.summary, /Chưa nên suy diễn/);
  assert.equal(summarizeEqSignal({}), "Chưa có dữ liệu EQ/onboarding.");
});

test("điểm tải việc phản ánh task quá hạn, ưu tiên cao và Doing quá 48 giờ", () => {
  const now = new Date("2026-07-31T12:00:00.000Z");
  const result = buildWorkloadAnalysis(
    [
      {
        title: "API",
        status: "doing",
        priority: "high",
        due_at: "2026-07-30T12:00:00.000Z",
        updated_at: "2026-07-28T10:00:00.000Z",
      },
      {
        title: "Docs",
        status: "todo",
        priority: "medium",
        due_at: "2026-08-02T12:00:00.000Z",
        updated_at: "2026-07-31T10:00:00.000Z",
      },
    ],
    now,
  );

  assert.equal(result.level, "high");
  assert.equal(result.overdueTasks, 1);
  assert.equal(result.staleDoingTasks, 1);
  assert.ok(result.signals.some((signal) => signal.includes("quá hạn")));
  assert.match(result.disclaimer, /không phải đánh giá tâm lý/);
});

test("task đã hoàn thành không làm tăng rủi ro tải việc", () => {
  const result = buildWorkloadAnalysis([
    {
      title: "Đã xong",
      status: "done",
      priority: "high",
      due_at: "2020-01-01T00:00:00.000Z",
      updated_at: "2020-01-01T00:00:00.000Z",
    },
  ]);

  assert.equal(result.score, 0);
  assert.equal(result.level, "low");
  assert.equal(result.activeTasks, 0);
});

test("coaching dự phòng tách mục tiêu, lý do và hành động cụ thể", () => {
  const personality = buildPersonalityAnalysis(COMPLETE_EQ_ANSWERS);
  const workload = buildWorkloadAnalysis([
    { title: "Task 1", status: "todo" },
  ]);
  const coaching = buildFallbackCoaching({
    name: "Khanh",
    skills: ["Next.js"],
    answers: COMPLETE_EQ_ANSWERS,
    personality,
    workload,
  });

  assert.equal(coaching.tips.length, 3);
  assert.equal(coaching.avoid.length, 2);
  assert.match(coaching.tips[0]?.suggestion ?? "", /Kanban/);
  assert.match(coaching.conversationStarter, /Khanh/);
});
