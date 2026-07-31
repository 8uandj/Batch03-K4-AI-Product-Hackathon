import assert from "node:assert/strict";
import test from "node:test";

import { selectProactiveCheckIn } from "./checkin.ts";

const NOW = new Date("2026-07-31T12:00:00.000Z");
const BASE_INPUT = {
  projectId: "project-1",
  projectName: "Nexus AI",
  userId: "user-1",
  userName: "Hữu Khanh",
  now: NOW,
};

test("ưu tiên Rework và nhắc đủ task, dự án, deadline còn lại", () => {
  const result = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "rework-task",
        title: "Hoàn thiện API Kanban",
        status: "rework",
        priority: "high",
        due_at: "2026-08-02T18:00:00.000Z",
        updated_at: "2026-07-31T11:59:00.000Z",
      },
      {
        id: "overdue-task",
        title: "Task quá hạn",
        status: "doing",
        due_at: "2026-07-25T12:00:00.000Z",
      },
    ],
  });

  assert.equal(result?.kind, "rework");
  assert.match(result?.message ?? "", /Hoàn thiện API Kanban/);
  assert.match(result?.message ?? "", /Nexus AI/);
  assert.match(result?.detail ?? "", /Deadline: Còn 2 ngày 6 giờ/);
  assert.equal(result?.task?.deadlineLabel, "Còn 2 ngày 6 giờ");
});

test("Rework không có deadline được mô tả rõ ràng", () => {
  const result = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "rework-no-deadline",
        title: "Bổ sung tiêu chí nghiệm thu",
        status: "rework",
        updated_at: "2026-07-31T11:00:00.000Z",
      },
    ],
  });

  assert.equal(result?.kind, "rework");
  assert.match(result?.detail ?? "", /Chưa có deadline/);
});

test("không hỏi thăm khi tải việc thấp và không có deadline trễ", () => {
  const result = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "task-1",
        title: "Task bình thường",
        status: "todo",
        priority: "medium",
        due_at: "2026-08-02T12:00:00.000Z",
      },
    ],
  });

  assert.equal(result, null);
});

test("ưu tiên hỏi task quá hạn cũ nhất trước cảnh báo quá tải", () => {
  const result = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "newer",
        title: "Task trễ mới",
        status: "doing",
        priority: "high",
        due_at: "2026-07-30T12:00:00.000Z",
      },
      {
        id: "older",
        title: "Task trễ cũ",
        status: "doing",
        priority: "high",
        due_at: "2026-07-27T12:00:00.000Z",
      },
      { id: "extra-1", title: "Extra 1", status: "doing" },
      { id: "extra-2", title: "Extra 2", status: "doing" },
    ],
  });

  assert.equal(result?.kind, "overdue");
  assert.equal(result?.task?.id, "older");
  assert.equal(result?.task?.daysOverdue, 4);
  assert.match(result?.detail ?? "", /1 task quá hạn khác/);
});

test("hỏi thăm quá tải khi nhiều task Doing dù chưa trễ deadline", () => {
  const tasks = Array.from({ length: 4 }, (_, index) => ({
    id: `task-${index}`,
    title: `Task ${index}`,
    status: "doing",
    priority: index === 0 ? "high" : "medium",
    due_at: "2026-08-10T12:00:00.000Z",
    updated_at: "2026-07-31T10:00:00.000Z",
  }));
  const result = selectProactiveCheckIn({ ...BASE_INPUT, tasks });

  assert.equal(result?.kind, "overload");
  assert.equal(result?.activeTasks, 4);
  assert.match(result?.message ?? "", /4 task đang mở/);
  assert.match(result?.detail ?? "", /Task 0/);
});

test("task đã xong không tạo cảnh báo dù deadline nằm trong quá khứ", () => {
  const result = selectProactiveCheckIn({
    ...BASE_INPUT,
    tasks: [
      {
        id: "done",
        title: "Đã hoàn thành",
        status: "done",
        priority: "high",
        due_at: "2020-01-01T00:00:00.000Z",
      },
    ],
  });

  assert.equal(result, null);
});
