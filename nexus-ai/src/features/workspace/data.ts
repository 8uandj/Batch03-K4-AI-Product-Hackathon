import { createClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/types";
import {
  buildWorkloadAnalysis,
  summarizeEqSignal,
} from "@/features/eq-radar/analysis";

import type {
  WorkspaceInvite,
  WorkspaceMemberProfile,
  WorkspaceProject,
  WorkspaceRiskEvent,
} from "./types";

type ProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  role: "pm" | "member";
};

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  status: string;
};

type TaskRow = {
  id: string;
  status: string;
  assignee_id: string | null;
  title: string;
  priority: string | null;
  due_at: string | null;
  updated_at: string | null;
};

type MemberRow = {
  user_id: string;
  role: "pm" | "member";
};

type UserRow = {
  id: string;
  name: string | null;
  skills: string[] | null;
  eq_answers: unknown;
};

type InviteRow = {
  id: string;
  email: string;
  role: "pm" | "member";
  token: string;
  status: string;
};

type RiskRow = {
  id: string;
  type: WorkspaceRiskEvent["type"];
  severity: WorkspaceRiskEvent["severity"];
  summary: string;
  user_id: string | null;
};

const TASK_STATUSES: TaskStatus[] = ["todo", "doing", "rework", "done"];

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.includes(value as TaskStatus);
}

function calculateWorkload(userId: string, tasks: TaskRow[]) {
  return buildWorkloadAnalysis(
    tasks.filter((task) => task.assignee_id === userId),
  ).score;
}

function countByStatus(tasks: TaskRow[]) {
  return tasks.reduce(
    (stats, task) => {
      if (isTaskStatus(task.status)) stats[task.status] += 1;
      return stats;
    },
    { todo: 0, doing: 0, rework: 0, done: 0 },
  );
}

export async function getCurrentUserProjects(): Promise<ProjectListItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data: memberships, error: memberError } = await supabase
    .from("project_members")
    .select("project_id,role")
    .eq("user_id", user.id);

  if (memberError || !memberships?.length) return [];

  const projectIds = memberships.map((membership) => membership.project_id);
  const roleByProject = new Map(
    memberships.map((membership) => [membership.project_id, membership.role]),
  );

  const { data: projects, error: projectError } = await supabase
    .from("projects")
    .select("id,name,description,status")
    .in("id", projectIds)
    .order("updated_at", { ascending: false });

  if (projectError || !projects) return [];

  return (projects as ProjectRow[]).map((project) => ({
    id: project.id,
    name: project.name,
    description: project.description,
    status: project.status,
    role: roleByProject.get(project.id) ?? "member",
  }));
}

export async function getWorkspaceOverview(projectId: string): Promise<{
  project: WorkspaceProject;
  invites: WorkspaceInvite[];
  risks: WorkspaceRiskEvent[];
  currentRole: "pm" | "member";
  dataSource: "supabase";
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: currentMembership, error: accessError } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (accessError || !currentMembership) return null;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id,name,description,status,deadline_at,allow_member_task_creation")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) return null;

  const [tasksResult, documentsResult, membersResult, invitesResult, risksResult] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,status,priority,due_at,updated_at,assignee_id")
        .eq("project_id", projectId),
      supabase
        .from("documents")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId),
      supabase.from("project_members").select("user_id,role").eq("project_id", projectId),
      supabase
        .from("project_invites")
        .select("id,email,role,token,status")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false }),
      supabase
        .from("risk_events")
        .select("id,type,severity,summary,user_id")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  const tasks = ((tasksResult.data ?? []) as TaskRow[]).filter((task) =>
    isTaskStatus(task.status),
  );
  const stats = countByStatus(tasks);
  const totalTasks = stats.todo + stats.doing + stats.done;
  const memberRows = (membersResult.data ?? []) as MemberRow[];
  const userIds = memberRows.map((member) => member.user_id);

  const usersResult = userIds.length
    ? await supabase.from("users").select("id,name,skills,eq_answers").in("id", userIds)
    : { data: [] as UserRow[] };

  const users = new Map(
    ((usersResult.data ?? []) as UserRow[]).map((user) => [user.id, user]),
  );

  const members: WorkspaceMemberProfile[] = memberRows.map((member) => {
    const user = users.get(member.user_id);

    return {
      id: member.user_id,
      name: user?.name || member.user_id.slice(0, 8),
      role: member.role,
      skills: user?.skills ?? [],
      eqSignal: summarizeEqSignal(
        user?.eq_answers && typeof user.eq_answers === "object"
          ? (user.eq_answers as Record<string, unknown>)
          : {},
      ),
      workload: calculateWorkload(member.user_id, tasks),
    };
  });

  const memberName = (id: string | null) =>
    id ? users.get(id)?.name || id.slice(0, 8) : "Chưa gán";

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description || "Chưa có mô tả project.",
      progress: totalTasks === 0 ? 0 : Math.round((stats.done / totalTasks) * 100),
      documentsIndexed: documentsResult.count ?? 0,
      activeTasks: stats.todo + stats.doing,
      members,
      deadlineAt: project.deadline_at,
      allowMemberTaskCreation: project.allow_member_task_creation === true,
    },
    invites: ((invitesResult.data ?? []) as InviteRow[]).map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      token: invite.token,
      status: ["pending", "awaiting_approval", "accepted", "revoked", "expired"].includes(invite.status)
        ? (invite.status as WorkspaceInvite["status"])
        : "pending",
    })),
    risks: ((risksResult.data ?? []) as RiskRow[]).map((risk) => ({
      id: risk.id,
      type: risk.type,
      severity: risk.severity,
      summary: risk.summary,
      owner: memberName(risk.user_id),
    })),
    currentRole: currentMembership.role,
    dataSource: "supabase",
  };
}
