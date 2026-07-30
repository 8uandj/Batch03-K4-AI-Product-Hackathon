export const TASK_STATUSES = ["todo", "doing", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

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

interface SupabaseTaskRow {
  id: string | number;
  title: string;
  status: string;
  updated_at: string;
  assignee_id?: string | null;
  assignee_name?: string | null;
}

interface SupabaseQueryError {
  message: string;
}

interface SupabaseQueryResult {
  data: SupabaseTaskRow[] | null;
  error: SupabaseQueryError | null;
}

/**
 * Minimal structural type compatible with the part of Supabase used here.
 * This keeps the analytics feature testable while the shared Supabase client
 * is still being prepared by the infrastructure owner.
 */
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
  return TASK_STATUSES.includes(value as TaskStatus);
}

export function calculateDashboardAnalytics(
  tasks: readonly DashboardTask[],
  options: AnalyticsOptions = {},
): DashboardAnalytics {
  const now = options.now ?? new Date();
  const thresholdHours = options.redFlagThresholdHours ?? 48;

  if (Number.isNaN(now.getTime())) {
    throw new DashboardAnalyticsError("Thời điểm thống kê không hợp lệ.");
  }

  if (!Number.isFinite(thresholdHours) || thresholdHours <= 0) {
    throw new DashboardAnalyticsError(
      "Ngưỡng cảnh báo phải là số giờ lớn hơn 0.",
    );
  }

  const stats: TaskStats = {
    todo: 0,
    doing: 0,
    done: 0,
    total: tasks.length,
    completionPercentage: 0,
  };
  const redFlags: RedFlag[] = [];
  let warningCount = 0;

  for (const task of tasks) {
    stats[task.status] += 1;

    if (task.status !== "doing") {
      continue;
    }

    const updatedAt = new Date(task.updatedAt);
    if (Number.isNaN(updatedAt.getTime())) {
      warningCount += 1;
      continue;
    }

    const delayHours = (now.getTime() - updatedAt.getTime()) / 3_600_000;
    if (delayHours <= thresholdHours) {
      continue;
    }

    redFlags.push({
      taskId: task.id,
      taskTitle: task.title,
      assigneeId: task.assigneeId ?? null,
      assigneeName: task.assigneeName?.trim() || "Chưa phân công",
      updatedAt: updatedAt.toISOString(),
      delayHours: Math.floor(delayHours),
    });
  }

  stats.completionPercentage =
    stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

  redFlags.sort((left, right) => right.delayHours - left.delayHours);

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
      `Không thể tải dữ liệu dashboard: ${error.message}`,
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
      assigneeName: row.assignee_name ?? null,
    });
  }

  const analytics = calculateDashboardAnalytics(tasks, options);

  return {
    ...analytics,
    warningCount: analytics.warningCount + invalidStatusCount,
  };
}
