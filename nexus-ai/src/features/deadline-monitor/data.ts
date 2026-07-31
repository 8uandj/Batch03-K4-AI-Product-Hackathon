import { requireProjectAccess } from "@/features/workspace/access";
import type { DeadlineNotificationKind } from "@/types";

export type DeadlineBotNotification = {
  id: string;
  taskId: string;
  kind: DeadlineNotificationKind;
  content: string;
  overdueHours: number;
  createdAt: string;
};

type NotificationRow = {
  id: string;
  task_id: string;
  kind: DeadlineNotificationKind;
  content: string;
  overdue_hours: number;
  created_at: string;
};

export async function getDeadlineBotNotifications(
  projectId: string,
): Promise<DeadlineBotNotification[]> {
  const access = await requireProjectAccess(projectId);
  if (!access.supabase) return [];

  const { data, error } = await access.supabase
    .from("deadline_notifications")
    .select("id,task_id,kind,content,overdue_hours,created_at")
    .eq("project_id", projectId)
    .eq("recipient_user_id", access.user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Không thể tải deadline notifications", error.message);
    return [];
  }

  return ((data ?? []) as NotificationRow[]).map((notification) => ({
    id: notification.id,
    taskId: notification.task_id,
    kind: notification.kind,
    content: notification.content,
    overdueHours: notification.overdue_hours,
    createdAt: notification.created_at,
  }));
}
