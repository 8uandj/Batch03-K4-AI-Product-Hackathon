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
  updatedAt?: string | null;
  blockerReported?: boolean;
  supportRequested?: boolean;
  dependencyBlocked?: boolean;
  communicationPreference?: "direct" | "quick_call" | "kanban";
  workloadRiskScore?: number;
  recentReminderCount?: number;
};

export type PlannedDeadlineNotification = {
  projectId: string;
  taskId: string;
  recipientUserId: string;
  kind: DeadlineNotificationKind;
  content: string;
  overdueHours: number;
  tone: "gentle" | "neutral" | "urgent";
  triggerReason: "overdue" | "escalation" | "stale_doing" | "blocker" | "dependency";
  actionLink: string;
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

function assigneeTone(base: "gentle" | "neutral" | "urgent", workloadRiskScore = 0) {
  // A high workload signal makes the private message more supportive instead
  // of increasing pressure. Leader escalation remains urgent separately.
  if (workloadRiskScore >= 80) return "gentle" as const;
  if (workloadRiskScore >= 60 && base === "urgent") return "neutral" as const;
  return base;
}

function communicationHint(preference: DeadlineTaskSnapshot["communicationPreference"]) {
  if (preference === "quick_call") return " Nếu cần, hãy đề xuất quick call 5–10 phút để gỡ vướng.";
  if (preference === "kanban") return " Bạn có thể cập nhật blocker trực tiếp trên thẻ Kanban để leader thấy đủ ngữ cảnh.";
  if (preference === "direct") return " Nếu cần, hãy nhắn leader ngắn gọn về blocker và hỗ trợ bạn cần.";
  return "";
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
  const staleHours = task.status === "doing" && task.updatedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(task.updatedAt).getTime()) / 3_600_000))
    : 0;
  const stale = staleHours >= 48;
  const blocker = task.blockerReported === true || task.supportRequested === true;
  const dependency = task.dependencyBlocked === true;
  const reducePrivateReminder = (task.workloadRiskScore ?? 0) >= 80 && (task.recentReminderCount ?? 0) >= 3 && !blocker && !dependency;
  if (overdueHours === null && !stale && !blocker && !dependency) return [];

  if (overdueHours === null) {
    const triggerReason = task.supportRequested || blocker ? "blocker" as const : dependency ? "dependency" as const : "stale_doing" as const;
    const baseTone = task.supportRequested || dependency || staleHours >= escalationHours ? "urgent" : "neutral";
    const checkInTone = assigneeTone(baseTone, task.workloadRiskScore);
    const hint = communicationHint(task.communicationPreference);
    const actionLink = `/project/${task.projectId}/board?task=${task.id}`;
    const notifications: PlannedDeadlineNotification[] = reducePrivateReminder
      ? []
      : [{
          projectId: task.projectId,
          taskId: task.id,
          recipientUserId: task.assigneeId,
          kind: "assignee_check_in",
          overdueHours: 0,
          tone: checkInTone,
          triggerReason,
          actionLink,
          content: task.supportRequested
            ? `Nexus đã ghi nhận yêu cầu hỗ trợ cho task “${task.title}”. Bạn có thể cập nhật blocker hoặc đề xuất chia bớt scope; lời nhắc này chỉ hiển thị với bạn.${hint}`
            : blocker
              ? `Nexus thấy task “${task.title}” có dấu hiệu blocker. Bạn đang vướng điều gì? Hãy cập nhật Kanban hoặc nhắn leader để được hỗ trợ.${hint}`
              : dependency
                ? `Task “${task.title}” đang bị chặn bởi một task dependency chưa hoàn tất. Hãy kiểm tra dependency hoặc báo PM nếu cần đổi thứ tự.${hint}`
                : `Task “${task.title}” đã ở Doing lâu hơn ${staleHours} giờ mà chưa cập nhật. Bạn có cần gỡ blocker hoặc điều chỉnh deadline không?${hint}`,
        }];
    if (task.supportRequested || dependency || staleHours >= escalationHours) {
      for (const leaderId of new Set(leaderIds)) notifications.push({
        projectId: task.projectId,
        taskId: task.id,
        recipientUserId: leaderId,
        kind: "leader_escalation",
        overdueHours: 0,
        tone: "urgent",
        triggerReason,
        actionLink,
        content: task.supportRequested
          ? `Thành viên đã yêu cầu hỗ trợ cho task “${task.title}”. Bạn nên kiểm tra workload, blocker và phương án chia việc.`
          : dependency
            ? `Task “${task.title}” đang bị chặn bởi dependency chưa hoàn tất. Bạn nên kiểm tra thứ tự task hoặc điều chỉnh kế hoạch.`
          : `Task “${task.title}” đã ở Doing lâu hơn ${staleHours} giờ. Bạn nên chủ động hỏi thăm và điều chỉnh scope/deadline nếu cần.`,
      });
    }
    return notifications;
  }

  const overdueLabel = formatOverdueDuration(overdueHours);
  const baseTone = overdueHours < 24 ? "gentle" : overdueHours < escalationHours ? "neutral" : "urgent";
  const tone = assigneeTone(baseTone, task.workloadRiskScore);
  const hint = communicationHint(task.communicationPreference);
  const actionLink = `/project/${task.projectId}/board?task=${task.id}`;
  const notifications: PlannedDeadlineNotification[] = reducePrivateReminder
    ? []
    : [{
        projectId: task.projectId,
        taskId: task.id,
        recipientUserId: task.assigneeId,
        kind: "assignee_check_in",
        overdueHours,
        tone,
        triggerReason: "overdue",
        actionLink,
        content: `Nexus thấy task “${task.title}” đã trễ ${overdueLabel}. Bạn đang vướng điều gì? Hãy cập nhật trạng thái trên Kanban hoặc nhắn leader để được hỗ trợ. Lời hỏi thăm này chỉ hiển thị với bạn.${hint}`,
      }];

  if (overdueHours < escalationHours) return notifications;

  for (const leaderId of new Set(leaderIds)) {
    notifications.push({
      projectId: task.projectId,
      taskId: task.id,
      recipientUserId: leaderId,
      kind: "leader_escalation",
      overdueHours,
      tone: "urgent",
      triggerReason: "escalation",
      actionLink,
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
