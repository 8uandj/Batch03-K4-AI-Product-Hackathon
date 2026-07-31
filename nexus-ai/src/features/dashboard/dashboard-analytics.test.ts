import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateDashboardAnalytics,
  DashboardAnalyticsError,
  fetchDashboardAnalytics,
  type DashboardTask,
  type TasksDataClient,
} from "./dashboard-analytics.ts";
const NOW = new Date("2026-07-30T12:00:00.000Z");

test("đếm task, tính phần trăm và chỉ cắm cờ Doing quá 48 giờ", () => {
  const tasks: DashboardTask[] = [
    {
      id: "1",
      title: "Quá hạn",
      status: "doing",
      updatedAt: "2026-07-28T11:59:00.000Z",
      assigneeName: "Khanh",
    },
    {
      id: "2",
      title: "Đúng ngưỡng",
      status: "doing",
      updatedAt: "2026-07-28T12:00:00.000Z",
    },
    {
      id: "3",
      title: "Đã xong",
      status: "done",
      updatedAt: "2026-07-20T00:00:00.000Z",
    },
    {
      id: "4",
      title: "Chưa làm",
      status: "todo",
      updatedAt: "2026-07-20T00:00:00.000Z",
    },
  ];

  const result = calculateDashboardAnalytics(tasks, { now: NOW });

  assert.deepEqual(result.stats, {
    todo: 1,
    doing: 2,
    done: 1,
    total: 4,
    completionPercentage: 25,
  });
  assert.equal(result.redFlags.length, 1);
  assert.equal(result.redFlags[0]?.taskId, "1");
  assert.equal(result.redFlags[0]?.delayHours, 48);
});

test("task Doing có timestamp lỗi được bỏ qua và báo warning", () => {
  const result = calculateDashboardAnalytics(
    [
      {
        id: "broken",
        title: "Timestamp lỗi",
        status: "doing",
        updatedAt: "not-a-date",
      },
    ],
    { now: NOW },
  );

  assert.equal(result.redFlags.length, 0);
  assert.equal(result.warningCount, 1);
});

test("dataset rỗng trả về tiến độ 0% thay vì chia cho 0", () => {
  const result = calculateDashboardAnalytics([], { now: NOW });

  assert.equal(result.stats.total, 0);
  assert.equal(result.stats.completionPercentage, 0);
});

test("fetch Supabase ánh xạ dữ liệu và bỏ status ngoài schema", async () => {
  const client: TasksDataClient = {
    from: () => ({
      select: async () => ({
        data: [
          {
            id: "10",
            title: "Task hợp lệ",
            status: "done",
            updated_at: "2026-07-30T10:00:00.000Z",
            assignee_id: null,
          },
          {
            id: "11",
            title: "Task sai status",
            status: "blocked",
            updated_at: "2026-07-30T10:00:00.000Z",
            assignee_id: null,
          },
        ],
        error: null,
      }),
    }),
  };

  const result = await fetchDashboardAnalytics(client, { now: NOW });

  assert.equal(result.stats.total, 1);
  assert.equal(result.stats.done, 1);
  assert.equal(result.warningCount, 1);
});

test("lỗi Supabase được chuyển thành thông báo có ngữ cảnh", async () => {
  const client: TasksDataClient = {
    from: () => ({
      select: async () => ({
        data: null,
        error: { message: "permission denied" },
      }),
    }),
  };

  await assert.rejects(
    () => fetchDashboardAnalytics(client, { now: NOW }),
    (error: unknown) =>
      error instanceof DashboardAnalyticsError &&
      error.message.includes("permission denied"),
  );
});


