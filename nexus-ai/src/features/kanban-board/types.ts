import type { TaskPriority, TaskStatus } from "@/types";

export type KanbanMember = {
  id: string;
  name: string;
  skills: string[];
  avatarUrl: string | null;
};

export type KanbanTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatarUrl: string | null;
  requiredSkills: string[];
  dueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type KanbanBoardData = {
  projectId: string;
  projectName: string;
  documentSummary: string;
  tasks: KanbanTask[];
  members: KanbanMember[];
  canAutoTask: boolean;
  dataSource: "mock" | "supabase";
};

export type AutoTaskingUser = Pick<KanbanMember, "id" | "name" | "skills">;
