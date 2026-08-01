export type BehavioralTask = {
  status: string;
  due_at: string | null;
  updated_at: string | null;
  priority?: string | null;
  created_at?: string | null;
};

export type BehavioralSignal = {
  score: number;
  level: "low" | "moderate" | "high" | "critical";
  signals: string[];
  evidence: {
    windowDays: number;
    lateNightEnabled: boolean;
    totalTasks: number;
    blockerReports?: number;
    supportRequests?: number;
    reminderCount?: number;
  };
  disclaimer: string;
};

export type BehavioralDailyRow = {
  activity_date: string;
  open_tasks: number;
  doing_tasks: number;
  overdue_tasks: number;
  stale_doing_tasks: number;
  reminder_count: number;
  completed_tasks: number;
  late_night_updates: number;
};

export type BehavioralWindow = {
  windowDays: number;
  daysObserved: number;
  averageOpenTasks: number;
  overdueTasks: number;
  staleDoingTasks: number;
  reminderCount: number;
  completedTasks: number;
  lateNightUpdates: number;
};

export function aggregateBehavioralWindows(rows: readonly BehavioralDailyRow[], now = new Date(), lateNightEnabled = true): BehavioralWindow[] {
  return [7, 30].map((windowDays) => {
    const cutoff = new Date(now.getTime() - windowDays * 86400000).toISOString().slice(0, 10);
    const windowRows = rows.filter((row) => row.activity_date >= cutoff);
    return {
      windowDays,
      daysObserved: windowRows.length,
      averageOpenTasks: windowRows.length ? Math.round(windowRows.reduce((sum, row) => sum + row.open_tasks, 0) / windowRows.length) : 0,
      overdueTasks: windowRows.reduce((sum, row) => sum + row.overdue_tasks, 0),
      staleDoingTasks: windowRows.reduce((sum, row) => sum + row.stale_doing_tasks, 0),
      reminderCount: windowRows.reduce((sum, row) => sum + row.reminder_count, 0),
      completedTasks: windowRows.reduce((sum, row) => sum + row.completed_tasks, 0),
      lateNightUpdates: lateNightEnabled ? windowRows.reduce((sum, row) => sum + row.late_night_updates, 0) : 0,
    };
  });
}

export function calculateBehavioralRisk(tasks: readonly BehavioralTask[], now = new Date(), options: { lateNightEnabled?: boolean; windowDays?: number; blockerReports?: number; supportRequests?: number; reminderCount?: number; timeZone?: string } = {}): BehavioralSignal {
  const windowDays = options.windowDays ?? 7;
  const lateNightEnabled = options.lateNightEnabled ?? true;
  const cutoff = now.getTime() - windowDays * 86400000;
  const observedTasks = tasks.filter((task) => {
    const timestamp = task.updated_at ?? task.created_at;
    return !timestamp || new Date(timestamp).getTime() >= cutoff;
  });
  const open = observedTasks.filter((task) => task.status !== "done");
  const overdue = open.filter((task) => task.due_at && new Date(task.due_at).getTime() < now.getTime()).length;
  const doing = open.filter((task) => task.status === "doing");
  const stale = doing.filter((task) => task.updated_at && now.getTime() - new Date(task.updated_at).getTime() > 48 * 3600000).length;
  const highPriority = open.filter((task) => task.priority === "high").length;
  const lateNight = lateNightEnabled ? observedTasks.filter((task) => {
    if (!task.updated_at) return false;
    const hourValue = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone: options.timeZone ?? "Asia/Ho_Chi_Minh" }).format(new Date(task.updated_at)));
    const hour = hourValue === 24 ? 0 : hourValue;
    return hour >= 23 || hour < 6;
  }).length : 0;
  const total = Math.max(1, observedTasks.length);
  const overdueRatio = overdue / Math.max(1, open.length);
  const staleRatio = stale / Math.max(1, doing.length);
  const workloadRatio = Math.min(1, open.length / 8);
  const lateNightRatio = lateNight / total;
  const completionConsistency = observedTasks.length ? observedTasks.filter((task) => task.status === "done").length / observedTasks.length : 1;
  const score = Math.min(100, Math.round(
    overdueRatio * 25 +
    staleRatio * 20 +
    workloadRatio * 20 +
    (highPriority / Math.max(1, open.length)) * 15 +
    lateNightRatio * 10 +
    (1 - completionConsistency) * 10,
  ));
  const level = score >= 80 ? "critical" : score >= 60 ? "high" : score >= 40 ? "moderate" : "low";
  return {
    score,
    level,
    signals: [
      open.length ? `${open.length} task đang mở` : "",
      overdue ? `${overdue} task quá hạn` : "",
      stale ? `${stale} task Doing chưa cập nhật quá 48 giờ` : "",
      highPriority ? `${highPriority} task ưu tiên cao chưa hoàn thành` : "",
      lateNight ? "Có hoạt động cập nhật task ngoài khung giờ thông thường" : "",
      options.blockerReports ? `${options.blockerReports} lần báo blocker trong kỳ` : "",
      options.supportRequests ? `${options.supportRequests} lần yêu cầu hỗ trợ trong kỳ` : "",
    ].filter(Boolean),
    evidence: {
      windowDays,
      lateNightEnabled,
      totalTasks: observedTasks.length,
      blockerReports: options.blockerReports,
      supportRequests: options.supportRequests,
      reminderCount: options.reminderCount,
    },
    disclaimer: "Đây là workload risk signal dựa trên hoạt động task, không phải chẩn đoán tâm lý hoặc burnout.",
  };
}
