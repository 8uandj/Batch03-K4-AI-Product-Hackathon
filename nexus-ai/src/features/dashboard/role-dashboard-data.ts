import { createClient } from "@/lib/supabase/server";
import type { RiskEventType, RiskSeverity, TaskPriority, TaskStatus } from "@/types";

export type DashboardMode = "pm" | "member" | "empty";

export type DashboardTaskItem = {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string;
  updatedAt: string;
  dueAt: string | null;
  delayHours: number;
  overdue: boolean;
};

export type DashboardStats = {
  todo: number;
  doing: number;
  done: number;
  total: number;
  completionPercentage: number;
};

export type MemberWorkload = {
  userId: string;
  name: string;
  openTasks: number;
  overdueTasks: number;
};

export type DashboardRiskEvent = {
  id: string;
  type: RiskEventType;
  severity: RiskSeverity;
  summary: string;
  ownerName: string;
  createdAt: string;
};

export type RoleDashboardData =
  | {
      mode: "pm";
      userName: string;
      projectIds: string[];
      projectCount: number;
      stats: DashboardStats;
      redFlags: DashboardTaskItem[];
      workload: MemberWorkload[];
      riskEvents: DashboardRiskEvent[];
      generatedAt: string;
    }
  | {
      mode: "member";
      userName: string;
      projectIds: string[];
      stats: DashboardStats;
      upcomingTasks: DashboardTaskItem[];
      overdueTasks: DashboardTaskItem[];
      doingTooLongTasks: DashboardTaskItem[];
      generatedAt: string;
    }
  | {
      mode: "empty";
      userName: string;
      generatedAt: string;
    };

type MembershipRow = {
  project_id: string;
  role: "pm" | "member";
};

type ProjectRow = {
  id: string;
  name: string;
};

type TaskRow = {
  id: string;
  title: string;
  project_id: string | null;
  status: string;
  priority: string;
  assignee_id: string | null;
  updated_at: string;
  due_at: string | null;
};

type UserRow = {
  id: string;
  name: string | null;
};

type RiskRow = {
  id: string;
  type: RiskEventType;
  severity: RiskSeverity;
  summary: string;
  user_id: string | null;
  created_at: string;
};

const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "done"];
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const RED_FLAG_THRESHOLD_HOURS = 48;

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

function asPriority(value: string): TaskPriority {
  return PRIORITIES.includes(value as TaskPriority) ? (value as TaskPriority) : "medium";
}

function displayName(emailOrName?: string | null) {
  if (!emailOrName) return "User";
  return emailOrName.includes("@") ? emailOrName.split("@")[0] : emailOrName;
}

function calculateStats(tasks: DashboardTaskItem[]): DashboardStats {
  const stats: DashboardStats = {
    todo: 0,
    doing: 0,
    done: 0,
    total: tasks.length,
    completionPercentage: 0,
  };

  for (const task of tasks) stats[task.status] += 1;
  stats.completionPercentage = stats.total === 0 ? 0 : Math.round((stats.done / stats.total) * 100);

  return stats;
}

function mapTasks(
  rows: TaskRow[],
  projectNames: Map<string, string>,
  userNames: Map<string, string>,
  now: Date,
): DashboardTaskItem[] {
  return rows
    .filter((task) => isTaskStatus(task.status))
    .map((task) => {
      const updatedAt = new Date(task.updated_at);
      const dueAt = task.due_at ? new Date(task.due_at) : null;
      const delayHours = Number.isNaN(updatedAt.getTime())
        ? 0
        : Math.max(0, Math.floor((now.getTime() - updatedAt.getTime()) / 3_600_000));

      return {
        id: task.id,
        title: task.title,
        projectId: task.project_id,
        projectName: task.project_id ? projectNames.get(task.project_id) || "Project" : "No project",
        status: task.status as TaskStatus,
        priority: asPriority(task.priority),
        assigneeId: task.assignee_id,
        assigneeName: task.assignee_id ? userNames.get(task.assignee_id) || task.assignee_id.slice(0, 8) : "Chưa phân công",
        updatedAt: task.updated_at,
        dueAt: task.due_at,
        delayHours,
        overdue: Boolean(dueAt && dueAt.getTime() < now.getTime() && task.status !== "done"),
      };
    });
}

async function loadNames(
  supabase: Awaited<ReturnType<typeof createClient>>,
  projectIds: string[],
  userIds: string[],
) {
  const [projectsResult, usersResult] = await Promise.all([
    projectIds.length
      ? supabase.from("projects").select("id,name").in("id", projectIds)
      : { data: [] as ProjectRow[], error: null },
    userIds.length
      ? supabase.from("users").select("id,name").in("id", userIds)
      : { data: [] as UserRow[], error: null },
  ]);

  if (projectsResult.error) throw new Error(projectsResult.error.message);
  if (usersResult.error) throw new Error(usersResult.error.message);

  return {
    projectNames: new Map(((projectsResult.data ?? []) as ProjectRow[]).map((project) => [project.id, project.name])),
    userNames: new Map(((usersResult.data ?? []) as UserRow[]).map((user) => [user.id, user.name || user.id.slice(0, 8)])),
  };
}

export async function getRoleDashboardData(): Promise<RoleDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("Bạn cần đăng nhập để xem dashboard.");

  const userName = displayName(user.user_metadata?.name || user.email);
  const now = new Date();
  const generatedAt = now.toISOString();

  const { data: memberships, error: membershipError } = await supabase
    .from("project_members")
    .select("project_id,role")
    .eq("user_id", user.id);

  if (membershipError) throw new Error(membershipError.message);

  const membershipRows = (memberships ?? []) as MembershipRow[];
  if (membershipRows.length === 0) return { mode: "empty", userName, generatedAt };

  const pmProjectIds = membershipRows
    .filter((membership) => membership.role === "pm")
    .map((membership) => membership.project_id);
  const allProjectIds = membershipRows.map((membership) => membership.project_id);

  if (pmProjectIds.length > 0) {
    const { data: tasksData, error: tasksError } = await supabase
      .from("tasks")
      .select("id,title,project_id,status,priority,assignee_id,updated_at,due_at")
      .in("project_id", pmProjectIds);

    if (tasksError) throw new Error(tasksError.message);

    const taskRows = (tasksData ?? []) as TaskRow[];
    const assigneeIds = Array.from(new Set(taskRows.map((task) => task.assignee_id).filter(Boolean))) as string[];
    const { projectNames, userNames } = await loadNames(supabase, pmProjectIds, assigneeIds);
    const tasks = mapTasks(taskRows, projectNames, userNames, now);
    const redFlags = tasks
      .filter((task) => task.overdue || (task.status === "doing" && task.delayHours > RED_FLAG_THRESHOLD_HOURS))
      .sort((left, right) => Number(right.overdue) - Number(left.overdue) || right.delayHours - left.delayHours);

    const workloadByUser = new Map<string, MemberWorkload>();
    for (const task of tasks) {
      if (!task.assigneeId || task.status === "done") continue;
      const current = workloadByUser.get(task.assigneeId) ?? {
        userId: task.assigneeId,
        name: task.assigneeName,
        openTasks: 0,
        overdueTasks: 0,
      };
      current.openTasks += 1;
      if (task.overdue) current.overdueTasks += 1;
      workloadByUser.set(task.assigneeId, current);
    }

    const { data: risksData, error: risksError } = await supabase
      .from("risk_events")
      .select("id,type,severity,summary,user_id,created_at")
      .in("project_id", pmProjectIds)
      .order("created_at", { ascending: false })
      .limit(10);

    if (risksError) throw new Error(risksError.message);

    const extraRiskUserIds = Array.from(
      new Set(((risksData ?? []) as RiskRow[]).map((risk) => risk.user_id).filter(Boolean)),
    ) as string[];
    if (extraRiskUserIds.length > 0) {
      const { userNames: riskUserNames } = await loadNames(supabase, [], extraRiskUserIds);
      riskUserNames.forEach((name, id) => userNames.set(id, name));
    }

    return {
      mode: "pm",
      userName,
      projectIds: pmProjectIds,
      projectCount: pmProjectIds.length,
      stats: calculateStats(tasks),
      redFlags,
      workload: Array.from(workloadByUser.values()).sort((left, right) => right.openTasks - left.openTasks),
      riskEvents: ((risksData ?? []) as RiskRow[]).map((risk) => ({
        id: risk.id,
        type: risk.type,
        severity: risk.severity,
        summary: risk.summary,
        ownerName: risk.user_id ? userNames.get(risk.user_id) || risk.user_id.slice(0, 8) : "Team",
        createdAt: risk.created_at,
      })),
      generatedAt,
    };
  }

  const { data: tasksData, error: tasksError } = await supabase
    .from("tasks")
    .select("id,title,project_id,status,priority,assignee_id,updated_at,due_at")
    .in("project_id", allProjectIds)
    .eq("assignee_id", user.id);

  if (tasksError) throw new Error(tasksError.message);

  const taskRows = (tasksData ?? []) as TaskRow[];
  const { projectNames, userNames } = await loadNames(supabase, allProjectIds, [user.id]);
  userNames.set(user.id, userName);
  const tasks = mapTasks(taskRows, projectNames, userNames, now);
  const upcomingTasks = tasks
    .filter((task) => task.dueAt && !task.overdue && task.status !== "done")
    .sort((left, right) => new Date(left.dueAt || 0).getTime() - new Date(right.dueAt || 0).getTime())
    .slice(0, 8);
  const overdueTasks = tasks
    .filter((task) => task.overdue)
    .sort((left, right) => new Date(left.dueAt || 0).getTime() - new Date(right.dueAt || 0).getTime());
  const doingTooLongTasks = tasks
    .filter((task) => task.status === "doing" && task.delayHours > RED_FLAG_THRESHOLD_HOURS)
    .sort((left, right) => right.delayHours - left.delayHours);

  return {
    mode: "member",
    userName,
    projectIds: allProjectIds,
    stats: calculateStats(tasks),
    upcomingTasks,
    overdueTasks,
    doingTooLongTasks,
    generatedAt,
  };
}
