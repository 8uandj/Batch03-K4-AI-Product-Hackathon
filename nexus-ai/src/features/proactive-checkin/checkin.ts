import {
  buildWorkloadAnalysis,
  type WorkloadTask,
} from "../eq-radar/analysis";

export type ProactiveCheckInKind = "rework";

export type ProactiveCheckIn = {
  id: string;
  kind: ProactiveCheckInKind;
  severity: "critical";
  title: string;
  message: string;
  detail: string;
  activeTasks: number;
  task: {
    id: string;
    title: string;
    dueAt: string;
    daysOverdue: number;
    remainingDeadline: string;
  };
};

export type CheckInTask = WorkloadTask & {
  id: string;
};

type CheckInInput = {
  projectId: string;
  userId: string;
  userName: string;
  tasks: readonly CheckInTask[];
  now?: Date;
};

function safeDisplayName(value: string) {
  const trimmed = value.trim();
  return trimmed || "bạn";
}

function shortTitle(value: string) {
  const trimmed = value.trim() || "Task chưa đặt tên";
  return trimmed.length > 80 ? `${trimmed.slice(0, 77)}…` : trimmed;
}

export function formatRemainingDeadline(dueAtStr?: string | null): string {
  if (!dueAtStr) return "Chưa thiết lập deadline";

  const dueAt = new Date(dueAtStr);
  const now = new Date();
  const diffMs = dueAt.getTime() - now.getTime();

  if (diffMs <= 0) {
    const overdueHours = Math.max(1, Math.floor(Math.abs(diffMs) / 3_600_000));
    const overdueDays = Math.floor(overdueHours / 24);
    if (overdueDays > 0) {
      return `Đã quá hạn ${overdueDays} ngày ${overdueHours % 24} giờ (Cần sửa gấp!)`;
    }
    return `Đã quá hạn ${overdueHours} giờ (Cần sửa gấp!)`;
  }

  const remainingHours = Math.floor(diffMs / 3_600_000);
  const remainingDays = Math.floor(remainingHours / 24);
  const hoursLeft = remainingHours % 24;

  if (remainingDays > 0) {
    return `Còn ${remainingDays} ngày ${hoursLeft} giờ nữa đến hạn`;
  }
  return `Còn ${remainingHours} giờ nữa đến hạn`;
}

// STRICT REQUIREMENT: ONLY return a check-in bubble when member has a task in REWORK status
export function selectProactiveCheckIn({
  projectId,
  userId,
  userName,
  tasks,
}: CheckInInput): ProactiveCheckIn | null {
  const name = safeDisplayName(userName);

  // STRICT FILTER: Only tasks with status === "rework"
  const reworkTasks = tasks.filter((task) => task.status === "rework");
  if (reworkTasks.length === 0) {
    return null; // Return null so NO bubble appears when there are no rework tasks!
  }

  const firstRework = reworkTasks[0];
  const taskTitle = shortTitle(firstRework.title);
  const remainingDeadline = formatRemainingDeadline(firstRework.due_at);

  return {
    id: ["rework", projectId, userId, firstRework.id].join(":"),
    kind: "rework",
    severity: "critical",
    title: "⚠️ Cảnh báo Task Cần Làm Lại (Rework)",
    message: `Chào ${name}! Quản trị viên (PM) vừa chuyển task "${taskTitle}" sang cột Rework do chưa đạt yêu cầu.`,
    detail: `📌 Task: ${taskTitle}\n⏳ Hạn deadline: ${remainingDeadline}`,
    activeTasks: reworkTasks.length,
    task: {
      id: firstRework.id,
      title: taskTitle,
      dueAt: firstRework.due_at || new Date().toISOString(),
      daysOverdue: 0,
      remainingDeadline,
    },
  };
}
