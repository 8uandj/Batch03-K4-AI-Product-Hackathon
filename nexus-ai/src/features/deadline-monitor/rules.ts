import type { DeadlineNotificationKind, TaskStatus } from "@/types";

export const DEFAULT_ESCALATION_HOURS = 48;

export type DeadlineTaskSnapshot = {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assigneeId: string;
  assigneeName: string;
  dueAt: string | null;
};

export type PlannedDeadlineNotification = {
  projectId: string;
  taskId: string;
  recipientUserId: string;
  kind: DeadlineNotificationKind;
  content: string;
  overdueHours: number;
};

export function getOverdueHours(
  task: Pick<DeadlineTaskSnapshot, "status" | "dueAt">,
  now = new Date(),
) {
  if (task.status === "done" || !task.dueAt) return null;

  const dueAt = new Date(task.dueAt);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() >= now.getTime()) {
    return null;
  }

  return Math.max(
    1,
    Math.floor((now.getTime() - dueAt.getTime()) / 3_600_000),
  );
}

export function formatOverdueDuration(hours: number) {
  if (hours < 24) return `${hours} giờ`;

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours
    ? `${days} ngày ${remainingHours} giờ`
    : `${days} ngày`;
}

export function planDeadlineNotifications({
  escalationHours = DEFAULT_ESCALATION_HOURS,
  leaderIds,
  now = new Date(),
  task,
}: {
  escalationHours?: number;
  leaderIds: string[];
  now?: Date;
  task: DeadlineTaskSnapshot;
}): PlannedDeadlineNotification[] {
  const overdueHours = getOverdueHours(task, now);
  if (overdueHours === null) return [];

  const overdueLabel = formatOverdueDuration(overdueHours);
  const notifications: PlannedDeadlineNotification[] = [
    {
      projectId: task.projectId,
      taskId: task.id,
      recipientUserId: task.assigneeId,
      kind: "assignee_check_in",
      overdueHours,
      content: `Nexus thấy task “${task.title}” đã trễ ${overdueLabel}. Bạn đang vướng điều gì? Hãy cập nhật trạng thái trên Kanban hoặc nhắn leader để được hỗ trợ. Lời hỏi thăm này chỉ hiển thị với bạn.`,
    },
  ];

  if (overdueHours < escalationHours) return notifications;

  for (const leaderId of new Set(leaderIds)) {
    notifications.push({
      projectId: task.projectId,
      taskId: task.id,
      recipientUserId: leaderId,
      kind: "leader_escalation",
      overdueHours,
      content: `Task “${task.title}” của ${task.assigneeName} đã trễ ${overdueLabel}. Nexus đã hỏi thăm thành viên. Bạn nên kiểm tra blocker, điều chỉnh scope/deadline hoặc phân bổ thêm người hỗ trợ.`,
    });
  }

  return notifications;
}

export function dateInTimeZone(
  value = new Date(),
  timeZone = "Asia/Ho_Chi_Minh",
) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric",
  }).formatToParts(value);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")}`;
}
