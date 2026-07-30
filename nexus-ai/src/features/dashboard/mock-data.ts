import {
  calculateDashboardAnalytics,
  type DashboardAnalytics,
  type DashboardTask,
} from "./dashboard-analytics.ts";

function hoursBefore(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 3_600_000).toISOString();
}

export function createMockTasks(now = new Date()): DashboardTask[] {
  return [
    {
      id: "task-01",
      title: "Hoàn thiện API phân tích EQ",
      status: "doing",
      updatedAt: hoursBefore(now, 76),
      assigneeId: "user-khanh",
      assigneeName: "Khanh",
    },
    {
      id: "task-02",
      title: "Kiểm tra luồng upload CV",
      status: "doing",
      updatedAt: hoursBefore(now, 26),
      assigneeId: "user-hung",
      assigneeName: "Thế Hưng",
    },
    {
      id: "task-03",
      title: "Thiết kế schema Supabase",
      status: "done",
      updatedAt: hoursBefore(now, 8),
      assigneeId: "user-hoang-hung",
      assigneeName: "Hoàng Hưng",
    },
    {
      id: "task-04",
      title: "Kết nối RAG Chat",
      status: "todo",
      updatedAt: hoursBefore(now, 12),
      assigneeId: "user-dat",
      assigneeName: "Đạt",
    },
    {
      id: "task-05",
      title: "Kiểm thử kéo thả Kanban",
      status: "done",
      updatedAt: hoursBefore(now, 5),
      assigneeId: "user-vinh",
      assigneeName: "Vinh",
    },
    {
      id: "task-06",
      title: "Chuẩn bị kịch bản demo",
      status: "todo",
      updatedAt: hoursBefore(now, 3),
      assigneeName: null,
    },
  ];
}

export function createMockDashboardAnalytics(
  now = new Date(),
): DashboardAnalytics {
  return calculateDashboardAnalytics(createMockTasks(now), { now });
}
