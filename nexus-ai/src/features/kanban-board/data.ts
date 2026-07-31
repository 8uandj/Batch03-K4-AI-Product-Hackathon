import { createClient } from "@/lib/supabase/server";
import { requireProjectAccess } from "@/features/workspace/access";
import type { TaskPriority, TaskStatus } from "@/types";
import type { KanbanBoardData, KanbanMember, KanbanTask } from "./types";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
};

type MemberRow = {
  user_id: string;
};

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  skills: string[] | null;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string;
  required_skills: string[] | null;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

function fallbackName(user: UserRow) {
  return user.name || user.email?.split("@")[0] || user.id.slice(0, 8);
}
export async function getKanbanBoardData(
  projectId: string,
): Promise<KanbanBoardData | null> {
  const access = await requireProjectAccess(projectId);
  const supabase = await createClient();

  const [projectResult, taskResult, memberResult, summaryResult] = await Promise.all([
    supabase
      .from("projects")
      .select("id,name,description")
      .eq("id", projectId)
      .maybeSingle(),
    supabase
      .from("tasks")
      .select(
        "id,title,description,status,priority,assignee_id,required_skills,due_at,created_at,updated_at",
      )
      .eq("project_id", projectId)
      .order("created_at", { ascending: false }),
    supabase
      .from("project_members")
      .select("user_id")
      .eq("project_id", projectId),
    supabase
      .from("ai_summaries")
      .select("content")
      .eq("project_id", projectId)
      .eq("type", "project_brief")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (projectResult.error || !projectResult.data) return null;
  if (taskResult.error) throw new Error(taskResult.error.message);
  if (memberResult.error) throw new Error(memberResult.error.message);

  const memberIds = ((memberResult.data ?? []) as MemberRow[]).map(
    (member) => member.user_id,
  );
  const usersResult = memberIds.length
    ? await supabase
        .from("users")
        .select("id,name,email,avatar_url,skills")
        .in("id", memberIds)
    : { data: [] as UserRow[], error: null };

  if (usersResult.error) throw new Error(usersResult.error.message);

  const users = (usersResult.data ?? []) as UserRow[];
  const userById = new Map(users.map((user) => [user.id, user]));
  const members: KanbanMember[] = users.map((user) => ({
    id: user.id,
    name: fallbackName(user),
    skills: user.skills ?? [],
    avatarUrl: user.avatar_url,
  }));
  const tasks: KanbanTask[] = ((taskResult.data ?? []) as TaskRow[]).map((task) => {
    const assignee = userById.get(task.assignee_id);
    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeId: task.assignee_id,
      assigneeName: assignee ? fallbackName(assignee) : task.assignee_id.slice(0, 8),
      assigneeAvatarUrl: assignee?.avatar_url ?? null,
      requiredSkills: task.required_skills ?? [],
      dueAt: task.due_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    };
  });
  const project = projectResult.data as ProjectRow;

  return {
    projectId,
    projectName: project.name,
    documentSummary:
      summaryResult.data?.content ||
      project.description ||
      "Chưa có project brief. Hãy mô tả mục tiêu và đầu ra mong muốn trước khi chạy Auto-Tasking.",
    tasks,
    members,
    canAutoTask: access.role === "pm",
    dataSource: "supabase",
  };
}
