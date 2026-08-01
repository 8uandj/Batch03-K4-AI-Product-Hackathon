export type DailyTaskSnapshot = {
  status: string;
  due_at: string | null;
  updated_at: string | null;
};

function safeTimeZone(value: string) {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return value;
  } catch {
    return "Asia/Ho_Chi_Minh";
  }
}

export function buildDailyActivityAggregate(input: {
  tasks: readonly DailyTaskSnapshot[];
  now?: Date;
  timeZone?: string;
  lateNightEnabled?: boolean;
  reminderCount?: number;
}) {
  const now = input.now ?? new Date();
  const timeZone = safeTimeZone(input.timeZone || "Asia/Ho_Chi_Minh");
  const openTasks = input.tasks.filter((task) => task.status !== "done");
  const doingTasks = openTasks.filter((task) => task.status === "doing");
  const overdueTasks = openTasks.filter((task) => task.due_at && new Date(task.due_at).getTime() < now.getTime());
  const staleDoingTasks = doingTasks.filter((task) => task.updated_at && now.getTime() - new Date(task.updated_at).getTime() > 48 * 3600000);
  const lateNightUpdates = input.lateNightEnabled === false ? [] : input.tasks.filter((task) => {
    if (!task.updated_at) return false;
    const hourValue = Number(new Intl.DateTimeFormat("en-US", { hour: "2-digit", hour12: false, timeZone }).format(new Date(task.updated_at)));
    const hour = hourValue === 24 ? 0 : hourValue;
    return hour >= 23 || hour < 6;
  });
  return {
    activity_date: new Intl.DateTimeFormat("en-CA", { timeZone }).format(now),
    open_tasks: openTasks.length,
    doing_tasks: doingTasks.length,
    overdue_tasks: overdueTasks.length,
    stale_doing_tasks: staleDoingTasks.length,
    reminder_count: Math.max(0, input.reminderCount ?? 0),
    completed_tasks: input.tasks.filter((task) => task.status === "done").length,
    late_night_updates: lateNightUpdates.length,
  };
}
