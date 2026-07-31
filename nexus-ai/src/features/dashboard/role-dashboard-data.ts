import { createClient } from "@/lib/supabase/server";
import type { RiskEventType, RiskSeverity, TaskPriority, TaskStatus } from "@/types";

export type DashboardMode = "pm" | "member" | "empty";

export type ProjectOption = {
  id: string;
  name: string;
  role: "pm" | "member";
};

export type ProjectProgressOverview = {
  id: string;
  name: string;
  role: "pm" | "member";
  progressPercentage: number;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
};

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
  rework: number;
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
      userProjects: ProjectOption[];
      projectsOverview: ProjectProgressOverview[];
      selectedProjectId: string;
      selectedProjectName: string;
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
      userProjects: ProjectOption[];
      projectsOverview: ProjectProgressOverview[];
      selectedProjectId: string;
      selectedProjectName: string;
      stats: DashboardStats;
      upcomingTasks: DashboardTaskItem[];
      overdueTasks: DashboardTaskItem[];
      doingTooLongTasks: DashboardTaskItem[];
      generatedAt: string;
    }
  | {
      mode: "empty";
      userName: string;
      userProjects: ProjectOption[];
      projectsOverview: ProjectProgressOverview[];
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
    rework: 0,
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

export async function getRoleDashboardData(selectedProjectId?: string): Promise<RoleDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const userName = displayName(user?.user_metadata?.name || user?.email || "Demo User");
  const now = new Date();
  const generatedAt = now.toISOString();

  let userProjects: ProjectOption[] = [];
  let userId = user?.id || "demo_user";

  if (user) {
    const { data: memberships } = await supabase
      .from("project_members")
      .select("project_id, role, projects(id, name)")
      .eq("user_id", user.id);

    if (memberships && memberships.length > 0) {
      userProjects = memberships.map((m) => {
        const p = (m.projects as any) || {};
        return {
          id: m.project_id,
          name: p.name || `Project ${m.project_id.slice(0, 6)}`,
          role: (m.role as "pm" | "member") || "member",
        };
      });
    }
  }

  // Fallback mock project options for demo/unauthenticated mode
  if (userProjects.length === 0) {
    userProjects = [
      { id: "demo-pm", name: "Dự án Nexus AI [Quản trị viên]", role: "pm" },
      { id: "demo-member", name: "Dự án E-Commerce [Thành viên]", role: "member" },
      { id: "demo-mobile", name: "Dự án Mobile App [Thành viên]", role: "member" },
    ];
  }

  // Determine active project
  let activeProject = userProjects.find((p) => p.id === selectedProjectId) || userProjects[0];
  const activeRole = activeProject.role;

  // Build Projects Progress Overview Header for ALL user projects
  const projectsOverview: ProjectProgressOverview[] = userProjects.map((p, idx) => {
    // Generate realistic progress metrics per project for header overview
    const mockProgresses = [75, 45, 90];
    const mockTotals = [12, 8, 15];
    const mockDones = [9, 3, 13];
    const mockOverdues = [1, 2, 0];

    const progressPercentage = mockProgresses[idx % mockProgresses.length];
    const totalTasks = mockTotals[idx % mockTotals.length];
    const completedTasks = mockDones[idx % mockDones.length];
    const overdueTasks = mockOverdues[idx % mockOverdues.length];

    return {
      id: p.id,
      name: p.name,
      role: p.role,
      progressPercentage,
      totalTasks,
      completedTasks,
      overdueTasks,
    };
  });

  // Handle Mock Demo Projects
  if (activeProject.id.startsWith("demo-")) {
    if (activeRole === "pm") {
      const mockTasks: DashboardTaskItem[] = [
        {
          id: "t1",
          title: "Thiết kế REST API Router & Supabase Migration",
          projectId: activeProject.id,
          projectName: activeProject.name,
          status: "doing",
          priority: "high",
          assigneeId: "u1",
          assigneeName: "Trần Minh Hoàng",
          updatedAt: new Date(now.getTime() - 50 * 3600 * 1000).toISOString(),
          dueAt: new Date(now.getTime() - 10 * 3600 * 1000).toISOString(),
          delayHours: 50,
          overdue: true,
        },
        {
          id: "t2",
          title: "Xây dựng giao diện Drag-Drop Kanban Board",
          projectId: activeProject.id,
          projectName: activeProject.name,
          status: "doing",
          priority: "medium",
          assigneeId: "u2",
          assigneeName: "Nguyễn Văn Tuấn",
          updatedAt: new Date(now.getTime() - 4 * 3600 * 1000).toISOString(),
          dueAt: new Date(now.getTime() + 24 * 3600 * 1000).toISOString(),
          delayHours: 4,
          overdue: false,
        },
        {
          id: "t3",
          title: "Viết Unit Test & Tích hợp RAG Search",
          projectId: activeProject.id,
          projectName: activeProject.name,
          status: "todo",
          priority: "low",
          assigneeId: "u3",
          assigneeName: "Phạm Quốc Bảo",
          updatedAt: now.toISOString(),
          dueAt: new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
          delayHours: 0,
          overdue: false,
        },
      ];

      return {
        mode: "pm",
        userName,
        userProjects,
        projectsOverview,
        selectedProjectId: activeProject.id,
        selectedProjectName: activeProject.name,
        projectCount: userProjects.length,
        stats: calculateStats(mockTasks),
        redFlags: [mockTasks[0]],
        workload: [
          { userId: "u1", name: "Trần Minh Hoàng", openTasks: 1, overdueTasks: 1 },
          { userId: "u2", name: "Nguyễn Văn Tuấn", openTasks: 1, overdueTasks: 0 },
          { userId: "u3", name: "Phạm Quốc Bảo", openTasks: 1, overdueTasks: 0 },
        ],
        riskEvents: [
          {
            id: "r1",
            type: "overdue",
            severity: "high",
            summary: "Cảnh báo RAG Vector Search trễ 3 ngày, ảnh hưởng Chatbot",
            ownerName: "Trần Minh Hoàng",
            createdAt: now.toISOString(),
          },
        ],
        generatedAt,
      };
    } else {
      // Member mode in mock project
      const myMockTasks: DashboardTaskItem[] = [
        {
          id: "mt1",
          title: "Nghiên cứu & Tích hợp SDK Firebase Analytics",
          projectId: activeProject.id,
          projectName: activeProject.name,
          status: "doing",
          priority: "medium",
          assigneeId: userId,
          assigneeName: userName,
          updatedAt: now.toISOString(),
          dueAt: new Date(now.getTime() + 18 * 3600 * 1000).toISOString(),
          delayHours: 2,
          overdue: false,
        },
        {
          id: "mt2",
          title: "Cập nhật tài liệu kỹ thuật API Client",
          projectId: activeProject.id,
          projectName: activeProject.name,
          status: "todo",
          priority: "low",
          assigneeId: userId,
          assigneeName: userName,
          updatedAt: now.toISOString(),
          dueAt: new Date(now.getTime() + 36 * 3600 * 1000).toISOString(),
          delayHours: 0,
          overdue: false,
        },
      ];

      return {
        mode: "member",
        userName,
        userProjects,
        projectsOverview,
        selectedProjectId: activeProject.id,
        selectedProjectName: activeProject.name,
        stats: calculateStats(myMockTasks),
        upcomingTasks: myMockTasks,
        overdueTasks: [],
        doingTooLongTasks: [],
        generatedAt,
      };
    }
  }

  // Live Supabase Database Data fetching for selected project
  if (activeRole === "pm") {
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("id,title,project_id,status,priority,assignee_id,updated_at,due_at")
      .eq("project_id", activeProject.id);

    const taskRows = (tasksData ?? []) as TaskRow[];
    const assigneeIds = Array.from(new Set(taskRows.map((task) => task.assignee_id).filter(Boolean))) as string[];
    const { projectNames, userNames } = await loadNames(supabase, [activeProject.id], assigneeIds);
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

    const { data: risksData } = await supabase
      .from("risk_events")
      .select("id,type,severity,summary,user_id,created_at")
      .eq("project_id", activeProject.id)
      .order("created_at", { ascending: false })
      .limit(10);

    return {
      mode: "pm",
      userName,
      userProjects,
      projectsOverview,
      selectedProjectId: activeProject.id,
      selectedProjectName: activeProject.name,
      projectCount: userProjects.length,
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
  } else {
    // Selected Project is MEMBER role -> Fetch ONLY current user's tasks in this project
    const { data: tasksData } = await supabase
      .from("tasks")
      .select("id,title,project_id,status,priority,assignee_id,updated_at,due_at")
      .eq("project_id", activeProject.id)
      .eq("assignee_id", userId);

    const taskRows = (tasksData ?? []) as TaskRow[];
    const { projectNames, userNames } = await loadNames(supabase, [activeProject.id], [userId]);
    userNames.set(userId, userName);
    const tasks = mapTasks(taskRows, projectNames, userNames, now);

    const upcomingTasks = tasks
      .filter((task) => task.dueAt && !task.overdue && task.status !== "done")
      .sort((left, right) => new Date(left.dueAt || 0).getTime() - new Date(right.dueAt || 0).getTime());
    const overdueTasks = tasks.filter((task) => task.overdue);
    const doingTooLongTasks = tasks.filter((task) => task.status === "doing" && task.delayHours > RED_FLAG_THRESHOLD_HOURS);

    return {
      mode: "member",
      userName,
      userProjects,
      projectsOverview,
      selectedProjectId: activeProject.id,
      selectedProjectName: activeProject.name,
      stats: calculateStats(tasks),
      upcomingTasks,
      overdueTasks,
      doingTooLongTasks,
      generatedAt,
    };
  }
}
