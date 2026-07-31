import { createAdminClient } from "@/lib/supabase/admin";
import type {
  DeadlineNotificationKind,
  ProjectRole,
  TaskStatus,
} from "@/types";

import {
  DEFAULT_ESCALATION_HOURS,
  dateInTimeZone,
  planDeadlineNotifications,
  type DeadlineTaskSnapshot,
} from "./rules";

type TaskRow = {
  id: string;
  project_id: string | null;
  title: string;
  status: TaskStatus;
  assignee_id: string;
  due_at: string | null;
};

type ProjectRow = {
  id: string;
  name: string;
  owner_id: string;
};

type MembershipRow = {
  project_id: string;
  user_id: string;
  role: ProjectRole;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
};

type ExistingNotificationRow = {
  task_id: string;
  recipient_user_id: string;
  kind: DeadlineNotificationKind;
};

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function displayName(user: UserRow | undefined, fallback: string) {
  return (
    user?.name ||
    user?.email?.split("@")[0] ||
    fallback.slice(0, 8)
  );
}

function notificationKey({
  kind,
  recipient_user_id,
  task_id,
}: ExistingNotificationRow) {
  return `${task_id}:${recipient_user_id}:${kind}`;
}

export type DeadlineMonitorResult = {
  notificationDay: string;
  overdueTasks: number;
  checkInsCreated: number;
  escalationsCreated: number;
  duplicateNotificationsSkipped: number;
};

export async function scanDeadlineTasks({
  now = new Date(),
  projectId,
}: {
  now?: Date;
  projectId?: string;
} = {}): Promise<DeadlineMonitorResult> {
  const supabase = createAdminClient();
  const notificationDay = dateInTimeZone(now);
  const escalationHours = positiveInteger(
    process.env.DEADLINE_ESCALATION_HOURS,
    DEFAULT_ESCALATION_HOURS,
  );

  let taskQuery = supabase
    .from("tasks")
    .select("id,project_id,title,status,assignee_id,due_at")
    .neq("status", "done")
    .not("project_id", "is", null)
    .not("due_at", "is", null)
    .lt("due_at", now.toISOString());

  if (projectId) taskQuery = taskQuery.eq("project_id", projectId);

  const { data: taskData, error: taskError } = await taskQuery;
  if (taskError) throw new Error(`Không thể quét task: ${taskError.message}`);

  const tasks = ((taskData ?? []) as TaskRow[]).filter(
    (task): task is TaskRow & { project_id: string } =>
      Boolean(task.project_id && task.due_at),
  );

  if (!tasks.length) {
    return {
      notificationDay,
      overdueTasks: 0,
      checkInsCreated: 0,
      escalationsCreated: 0,
      duplicateNotificationsSkipped: 0,
    };
  }

  const projectIds = [...new Set(tasks.map((task) => task.project_id))];
  const assigneeIds = [...new Set(tasks.map((task) => task.assignee_id))];

  const [projectResult, membershipResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,owner_id")
      .in("id", projectIds),
    supabase
      .from("project_members")
      .select("project_id,user_id,role")
      .in("project_id", projectIds)
      .eq("role", "pm"),
  ]);

  if (projectResult.error) {
    throw new Error(`Không thể tải project: ${projectResult.error.message}`);
  }
  if (membershipResult.error) {
    throw new Error(
      `Không thể tải danh sách leader: ${membershipResult.error.message}`,
    );
  }

  const projects = (projectResult.data ?? []) as ProjectRow[];
  const memberships = (membershipResult.data ?? []) as MembershipRow[];
  const leaderIds = [
    ...new Set([
      ...memberships.map((membership) => membership.user_id),
      ...projects.map((project) => project.owner_id),
    ]),
  ];
  const userIds = [...new Set([...assigneeIds, ...leaderIds])];
  const { data: userData, error: userError } = await supabase
    .from("users")
    .select("id,name,email")
    .in("id", userIds);

  if (userError) throw new Error(`Không thể tải thành viên: ${userError.message}`);

  const userById = new Map(
    ((userData ?? []) as UserRow[]).map((user) => [user.id, user]),
  );
  const leadersByProject = new Map<string, Set<string>>();

  for (const project of projects) {
    leadersByProject.set(project.id, new Set([project.owner_id]));
  }
  for (const membership of memberships) {
    const leaders =
      leadersByProject.get(membership.project_id) ?? new Set<string>();
    leaders.add(membership.user_id);
    leadersByProject.set(membership.project_id, leaders);
  }

  const planned = tasks.flatMap((row) => {
    const task: DeadlineTaskSnapshot = {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      status: row.status,
      assigneeId: row.assignee_id,
      assigneeName: displayName(
        userById.get(row.assignee_id),
        row.assignee_id,
      ),
      dueAt: row.due_at,
    };

    return planDeadlineNotifications({
      escalationHours,
      leaderIds: [...(leadersByProject.get(row.project_id) ?? [])],
      now,
      task,
    });
  });

  const taskIds = [...new Set(tasks.map((task) => task.id))];
  const { data: existingData, error: existingError } = await supabase
    .from("deadline_notifications")
    .select("task_id,recipient_user_id,kind")
    .eq("notification_day", notificationDay)
    .in("task_id", taskIds);

  if (existingError) {
    throw new Error(
      `Không thể kiểm tra thông báo đã gửi: ${existingError.message}. Hãy chạy migration 014_deadline_monitor.sql.`,
    );
  }

  const existingKeys = new Set(
    ((existingData ?? []) as ExistingNotificationRow[]).map(notificationKey),
  );
  const pending = planned.filter(
    (notification) =>
      !existingKeys.has(
        notificationKey({
          task_id: notification.taskId,
          recipient_user_id: notification.recipientUserId,
          kind: notification.kind,
        }),
      ),
  );

  if (pending.length) {
    const { error: insertError } = await supabase
      .from("deadline_notifications")
      .upsert(
        pending.map((notification) => ({
          project_id: notification.projectId,
          task_id: notification.taskId,
          recipient_user_id: notification.recipientUserId,
          kind: notification.kind,
          content: notification.content,
          overdue_hours: notification.overdueHours,
          notification_day: notificationDay,
        })),
        {
          ignoreDuplicates: true,
          onConflict: "task_id,recipient_user_id,kind,notification_day",
        },
      );

    if (insertError) {
      throw new Error(`Không thể tạo thông báo: ${insertError.message}`);
    }
  }

  return {
    notificationDay,
    overdueTasks: tasks.length,
    checkInsCreated: pending.filter(
      (notification) => notification.kind === "assignee_check_in",
    ).length,
    escalationsCreated: pending.filter(
      (notification) => notification.kind === "leader_escalation",
    ).length,
    duplicateNotificationsSkipped: planned.length - pending.length,
  };
}
