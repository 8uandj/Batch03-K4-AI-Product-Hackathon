import {
  calculateDashboardAnalytics,
  type DashboardAnalytics,
  type DashboardTask,
  type TaskStats,
} from "./dashboard-analytics.ts";

export const mockStats: Pick<TaskStats, "todo" | "doing" | "done"> = {
  todo: 5,
  doing: 3,
  done: 2,
};

export const mockRedFlags = [
  {
    task: "Làm API",
    user: "A",
    delay: "3 days",
  },
];

function hoursBefore(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 3_600_000).toISOString();
}

export function createMockTasks(now = new Date()): DashboardTask[] {
  return [
    {
      id: "task-01",
      title: mockRedFlags[0].task,
      status: "doing",
      updatedAt: hoursBefore(now, 72),
      assigneeId: "user-a",
      assigneeName: mockRedFlags[0].user,
    },
    {
      id: "task-02",
      title: "Kiem tra luong upload CV",
      status: "doing",
      updatedAt: hoursBefore(now, 26),
      assigneeId: "user-hung",
      assigneeName: "The Hung",
    },
    {
      id: "task-03",
      title: "Review UI Dashboard",
      status: "doing",
      updatedAt: hoursBefore(now, 7),
      assigneeId: "user-khanh",
      assigneeName: "Khanh",
    },
    {
      id: "task-04",
      title: "Thiet ke schema Supabase",
      status: "done",
      updatedAt: hoursBefore(now, 8),
      assigneeId: "user-hoang-hung",
      assigneeName: "Hoang Hung",
    },
    {
      id: "task-05",
      title: "Kiem thu keo tha Kanban",
      status: "done",
      updatedAt: hoursBefore(now, 5),
      assigneeId: "user-vinh",
      assigneeName: "Vinh",
    },
    {
      id: "task-06",
      title: "Ket noi RAG Chat",
      status: "todo",
      updatedAt: hoursBefore(now, 12),
      assigneeId: "user-dat",
      assigneeName: "Dat",
    },
    {
      id: "task-07",
      title: "Tao prompt phan tich tai lieu",
      status: "todo",
      updatedAt: hoursBefore(now, 10),
      assigneeName: null,
    },
    {
      id: "task-08",
      title: "Chuan bi kich ban demo",
      status: "todo",
      updatedAt: hoursBefore(now, 3),
      assigneeName: null,
    },
    {
      id: "task-09",
      title: "Viet huong dan ket noi Supabase",
      status: "todo",
      updatedAt: hoursBefore(now, 2),
      assigneeName: "PM",
    },
    {
      id: "task-10",
      title: "Chot tieu chi nghiem thu",
      status: "todo",
      updatedAt: hoursBefore(now, 1),
      assigneeName: "PM",
    },
  ];
}

export function createMockDashboardAnalytics(
  now = new Date(),
): DashboardAnalytics {
  return calculateDashboardAnalytics(createMockTasks(now), { now });
}
