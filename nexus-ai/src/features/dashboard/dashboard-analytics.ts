import type { Task, TaskStatus } from "@/types";

export type { TaskStatus };

export const TASK_STATUSES = ["todo", "doing", "rework", "done"] as const;

export interface DashboardTask {
  id: string;
  title: string;
  status: TaskStatus;
  updatedAt: string;
  assigneeId?: string | null;
  assigneeName?: string | null;
}

export interface TaskStats {
  todo: number;
  doing: number;
  rework: number;
  done: number;
  total: number;
  completionPercentage: number;
}

export interface RedFlag {
  taskId: string;
  taskTitle: string;
  assigneeId: string | null;
  assigneeName: string;
  updatedAt: string;
  delayHours: number;
}

export interface DashboardAnalytics {
  stats: TaskStats;
  redFlags: RedFlag[];
  generatedAt: string;
  warningCount: number;
}

export interface AnalyticsOptions {
  now?: Date;
  redFlagThresholdHours?: number;
}

type SupabaseTaskRow = Pick<
  Task,
  "id" | "title" | "updated_at"
> & {
  status: string;
  assignee_id: string | null;
};

interface SupabaseQueryError {
  message: string;
}

interface SupabaseQueryResult {
  data: SupabaseTaskRow[] | null;
  error: SupabaseQueryError | null;
}

export interface TasksDataClient {
  from(table: "tasks"): {
    select(columns: string): PromiseLike<SupabaseQueryResult>;
  };
}

export class DashboardAnalyticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DashboardAnalyticsError";
  }
}

export function isTaskStatus(value: string): value is TaskStatus {
  return (TASK_STATUSES as readonly string[]).includes(value);
}

export function calculateDashboardAnalytics(
  tasks: readonly DashboardTask[],
  options: AnalyticsOptions = {},
): DashboardAnalytics {
  const now = options.now ?? new Date();
  const thresholdHours = options.redFlagThresholdHours ?? 48;

  if (Number.isNaN(now.getTime())) {
    throw new DashboardAnalyticsError("Thoi diem thong ke khong hop le.");
  }

  if (!Number.isFinite(thresholdHours) || thresholdHours <= 0) {
    throw new DashboardAnalyticsError(
      "Nguong canh bao phai la so gio lon hon 0.",
    );
  }

  const stats: TaskStats = {
    todo: 0,
    doing: 0,
    rework: 0,
    done: 0,
    total: tasks.length,
    completionPercentage: 0,
  };
  const redFlags: RedFlag[] = [];
  let warningCount = 0;

  for (const task of tasks) {
    if (task.status in stats) {
      stats[task.status] += 1;
    }

    if (task.status !== "doing" && task.status !== "rework") {
      continue;
    }

    const updatedAt = new Date(task.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      warningCount += 1;
      continue;
    }

    const delayMs = now.getTime() - updatedAt.getTime();
    const delayHours = Math.floor(delayMs / (1000 * 60 * 60));

    if (delayHours >= thresholdHours) {
      redFlags.push({
        taskId: task.id,
        taskTitle: task.title.trim() || "Task khong co tieu de",
        assigneeId: task.assigneeId ?? null,
        assigneeName: task.assigneeName?.trim() || "Chua phan cong",
        updatedAt: task.updatedAt,
        delayHours,
      });
    }
  }

  redFlags.sort((a, b) => b.delayHours - a.delayHours);

  stats.completionPercentage =
    tasks.length === 0
      ? 0
      : Math.round((stats.done / tasks.length) * 100);

  return {
    stats,
    redFlags,
    generatedAt: now.toISOString(),
    warningCount,
  };
}

export async function fetchDashboardAnalytics(
  client: TasksDataClient,
  options: AnalyticsOptions = {},
): Promise<DashboardAnalytics> {
  const { data, error } = await client
    .from("tasks")
    .select("id,title,status,updated_at,assignee_id");

  if (error) {
    throw new DashboardAnalyticsError(
      `Khong the tai du lieu dashboard: ${error.message}`,
    );
  }

  const tasks: DashboardTask[] = [];
  let invalidStatusCount = 0;

  for (const row of data ?? []) {
    if (!isTaskStatus(row.status)) {
      invalidStatusCount += 1;
      continue;
    }

    tasks.push({
      id: String(row.id),
      title: row.title,
      status: row.status,
      updatedAt: row.updated_at,
      assigneeId: row.assignee_id ?? null,
      assigneeName: row.assignee_id ?? null,
    });
  }

  const analytics = calculateDashboardAnalytics(tasks, options);

  return {
    ...analytics,
    warningCount: analytics.warningCount + invalidStatusCount,
  };
}

export function formatDelayHours(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) {
    return "0h";
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days === 0) {
    return `${hours}h`;
  }

  if (remainingHours === 0) {
    return `${days}d`;
  }

  return `${days}d ${remainingHours}h`;
}

export function fromDomainTask(task: Task): DashboardTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    updatedAt: task.updated_at,
    assigneeId: task.assignee_id,
    assigneeName: null,
  };
}
