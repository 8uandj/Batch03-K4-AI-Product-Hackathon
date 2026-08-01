import { createAdminClient } from "@/lib/supabase/admin";
import { persistAgentRun } from "@/features/ai/model-router";
import { aggregateDelegationRisk, type DelegationDaily, type DelegationPrivacy } from "@/features/ai/smart-delegation";
import type {
  DeadlineNotificationKind,
  ProjectRole,
  TaskStatus,
} from "@/types";

import {
  DEFAULT_ESCALATION_HOURS,
  dateInTimeZone,
  getOverdueHours,
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
  updated_at: string | null;
  blocked_by_task_id: string | null;
};

type DependencyRow = { id: string; project_id: string | null; status: TaskStatus };

type ActivityRow = {
  task_id: string;
  event_type: "blocker_reported" | "support_requested";
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
  eq_answers?: Record<string, unknown> | null;
};

type PreferenceRow = DelegationPrivacy & { project_id: string; timezone?: string | null };

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

function communicationPreference(value: Record<string, unknown> | null | undefined): "direct" | "quick_call" | "kanban" | undefined {
  const answer = value?.q3_communication ?? value?.communication;
  if (typeof answer !== "string") return undefined;
  const choice = answer.trim().slice(0, 1).toUpperCase();
  return choice === "A" ? "direct" : choice === "B" ? "quick_call" : choice === "C" ? "kanban" : undefined;
}

export type DeadlineMonitorResult = {
  notificationDay: string;
  overdueTasks: number;
  checkInsCreated: number;
  escalationsCreated: number;
  duplicateNotificationsSkipped: number;
  staleTasks: number;
  blockerTasks: number;
  dependencyTasks: number;
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
  const startedAt = Date.now();
  const escalationHours = positiveInteger(
    process.env.DEADLINE_ESCALATION_HOURS,
    DEFAULT_ESCALATION_HOURS,
  );

  let taskQuery = supabase
    .from("tasks")
    .select("id,project_id,title,status,assignee_id,due_at,updated_at,blocked_by_task_id")
    .neq("status", "done")
    .not("project_id", "is", null)

  if (projectId) taskQuery = taskQuery.eq("project_id", projectId);

  const { data: taskData, error: taskError } = await taskQuery;
  if (taskError) throw new Error(`Không thể quét task: ${taskError.message}`);

  const tasks = ((taskData ?? []) as TaskRow[]).filter(
    (task): task is TaskRow & { project_id: string } =>
      Boolean(task.project_id),
  );

  if (!tasks.length) {
    return {
      notificationDay,
      overdueTasks: 0,
      checkInsCreated: 0,
      escalationsCreated: 0,
      duplicateNotificationsSkipped: 0,
      staleTasks: 0,
      blockerTasks: 0,
      dependencyTasks: 0,
    };
  }

  const projectIds = [...new Set(tasks.map((task) => task.project_id))];
  const assigneeIds = [...new Set(tasks.map((task) => task.assignee_id))];
  const taskIds = [...new Set(tasks.map((task) => task.id))];
  const dependencyIds = [...new Set(tasks.map((task) => task.blocked_by_task_id).filter((id): id is string => Boolean(id)))];
  const dependencyRows = dependencyIds.length
    ? await supabase.from("tasks").select("id,project_id,status").in("id", dependencyIds)
    : { data: [], error: null };
  if (dependencyRows.error) throw new Error(`Không thể tải dependency: ${dependencyRows.error.message}`);
  const dependencyById = new Map(((dependencyRows.data ?? []) as DependencyRow[]).map((row) => [row.id, row]));
  const { data: activityData, error: activityError } = await supabase
    .from("task_activity_events")
    .select("task_id,event_type")
    .in("task_id", taskIds)
    .in("event_type", ["blocker_reported", "support_requested"]);
  if (activityError) throw new Error(`Không thể tải blocker activity: ${activityError.message}`);
  const activityByTask = new Map<string, { blocker: boolean; support: boolean }>();
  for (const event of (activityData ?? []) as ActivityRow[]) {
    const current = activityByTask.get(event.task_id) ?? { blocker: false, support: false };
    current.blocker ||= event.event_type === "blocker_reported";
    current.support ||= event.event_type === "support_requested";
    activityByTask.set(event.task_id, current);
  }

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
    .select("id,name,email,eq_answers")
    .in("id", userIds);

  if (userError) throw new Error(`Không thể tải thành viên: ${userError.message}`);

  const userById = new Map(
    ((userData ?? []) as UserRow[]).map((user) => [user.id, user]),
  );
  const [preferenceResult, dailyResult] = await Promise.all([
    supabase.from("member_ai_preferences").select("project_id,user_id,behavioral_insights_enabled,late_night_signal_enabled").in("project_id", projectIds),
    supabase.from("member_activity_daily").select("project_id,user_id,activity_date,open_tasks,doing_tasks,overdue_tasks,stale_doing_tasks,reminder_count,completed_tasks,late_night_updates").in("project_id", projectIds).gte("activity_date", new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10)),
  ]);
  if (preferenceResult.error) throw new Error(`Không thể tải privacy preference: ${preferenceResult.error.message}`);
  if (dailyResult.error) throw new Error(`Không thể tải behavioral aggregate: ${dailyResult.error.message}`);
  const preferenceByMember = new Map(((preferenceResult.data ?? []) as PreferenceRow[]).map((preference) => [`${preference.project_id}:${preference.user_id}`, preference]));
  const dailyByMember = new Map<string, DelegationDaily[]>();
  for (const row of (dailyResult.data ?? []) as Array<DelegationDaily & { project_id: string }>) {
    const key = `${row.project_id}:${row.user_id}`;
    dailyByMember.set(key, [...(dailyByMember.get(key) ?? []), row]);
  }
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
    const memberKey = `${row.project_id}:${row.assignee_id}`;
    const preference = preferenceByMember.get(memberKey);
    const privacy: DelegationPrivacy = preference ?? { user_id: row.assignee_id, behavioral_insights_enabled: true, late_night_signal_enabled: true };
    const workload = aggregateDelegationRisk(dailyByMember.get(memberKey) ?? [], privacy.behavioral_insights_enabled !== false, privacy.late_night_signal_enabled !== false, now);
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
      updatedAt: row.updated_at,
      blockerReported: activityByTask.get(row.id)?.blocker,
      supportRequested: activityByTask.get(row.id)?.support,
      dependencyBlocked: row.blocked_by_task_id
        ? dependencyById.get(row.blocked_by_task_id)?.status !== "done"
        : false,
      communicationPreference: communicationPreference(userById.get(row.assignee_id)?.eq_answers),
      workloadRiskScore: workload.score,
      recentReminderCount: (dailyByMember.get(memberKey) ?? []).reduce((sum, daily) => sum + Math.max(0, daily.reminder_count), 0),
    };

    return planDeadlineNotifications({
      escalationHours,
      leaderIds: [...(leadersByProject.get(row.project_id) ?? [])],
      now,
      task,
    });
  });

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
  const uniquePlanned = [...new Map(planned.map((notification) => [notificationKey({ task_id: notification.taskId, recipient_user_id: notification.recipientUserId, kind: notification.kind }), notification])).values()];
  const pending = uniquePlanned.filter(
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
          tone: notification.tone,
          trigger_reason: notification.triggerReason,
          action_link: notification.actionLink,
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

  await persistAgentRun(supabase, {
    project_id: projectId ?? null,
    agent: "deadline",
    tier: "rule",
    model: null,
    status: "success",
    fallback: false,
    latency_ms: Date.now() - startedAt,
  });

  return {
    notificationDay,
      overdueTasks: tasks.filter((task) => getOverdueHours({ status: task.status, dueAt: task.due_at }, now) !== null).length,
    checkInsCreated: pending.filter(
      (notification) => notification.kind === "assignee_check_in",
    ).length,
    escalationsCreated: pending.filter(
      (notification) => notification.kind === "leader_escalation",
    ).length,
    duplicateNotificationsSkipped: uniquePlanned.length - pending.length,
    staleTasks: tasks.filter((task) => task.status === "doing" && task.updated_at && now.getTime() - new Date(task.updated_at).getTime() >= 48 * 3600000).length,
    blockerTasks: [...activityByTask.values()].filter((activity) => activity.blocker || activity.support).length,
    dependencyTasks: tasks.filter((task) => task.blocked_by_task_id && dependencyById.get(task.blocked_by_task_id)?.status !== "done").length,
  };
}
