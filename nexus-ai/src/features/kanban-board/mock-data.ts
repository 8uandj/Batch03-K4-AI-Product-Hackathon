import type { KanbanBoardData, KanbanMember, KanbanTask } from "./types";

export const mockKanbanMembers: KanbanMember[] = [
  {
    id: "dev-1",
    name: "Thế Hưng",
    skills: ["Next.js", "Supabase", "UI/UX"],
    avatarUrl: null,
  },
  {
    id: "dev-2",
    name: "Đạt",
    skills: ["OpenAI", "RAG", "pgvector"],
    avatarUrl: null,
  },
  {
    id: "dev-3",
    name: "Vinh",
    skills: ["Workflow", "dnd-kit", "TypeScript"],
    avatarUrl: null,
  },
  {
    id: "dev-4",
    name: "Khanh",
    skills: ["Analytics", "Dashboard", "EQ Radar"],
    avatarUrl: null,
  },
];

export const initialTasks: KanbanTask[] = [
  {
    id: "mock-task-1",
    title: "Chuẩn hóa database contract",
    description: "Chốt schema dùng chung cho users, projects và tasks.",
    status: "done",
    priority: "high",
    assigneeId: "dev-1",
    assigneeName: "Thế Hưng",
    assigneeAvatarUrl: null,
    requiredSkills: ["Supabase", "Database"],
    dueAt: "2026-08-01T10:00:00.000Z",
    createdAt: "2026-07-28T08:00:00.000Z",
    updatedAt: "2026-07-30T10:00:00.000Z",
  },
  {
    id: "mock-task-2",
    title: "Index tài liệu vào pgvector",
    description: "Chunk tài liệu, tạo embedding và kiểm thử similarity search.",
    status: "doing",
    priority: "high",
    assigneeId: "dev-2",
    assigneeName: "Đạt",
    assigneeAvatarUrl: null,
    requiredSkills: ["RAG", "pgvector"],
    dueAt: "2026-08-03T10:00:00.000Z",
    createdAt: "2026-07-29T08:00:00.000Z",
    updatedAt: "2026-07-31T09:00:00.000Z",
  },
  {
    id: "mock-task-3",
    title: "Xây dựng Kanban drag & drop",
    description: "Hoàn thiện board ba cột và cập nhật trạng thái optimistic.",
    status: "doing",
    priority: "high",
    assigneeId: "dev-3",
    assigneeName: "Vinh",
    assigneeAvatarUrl: null,
    requiredSkills: ["dnd-kit", "TypeScript"],
    dueAt: "2026-08-02T10:00:00.000Z",
    createdAt: "2026-07-30T08:00:00.000Z",
    updatedAt: "2026-07-31T10:00:00.000Z",
  },
  {
    id: "mock-task-4",
    title: "Thiết kế Red Flag dashboard",
    description: "Hiển thị task quá hạn, workload và risk event.",
    status: "todo",
    priority: "medium",
    assigneeId: "dev-4",
    assigneeName: "Khanh",
    assigneeAvatarUrl: null,
    requiredSkills: ["Analytics", "Dashboard"],
    dueAt: "2026-08-05T10:00:00.000Z",
    createdAt: "2026-07-30T08:00:00.000Z",
    updatedAt: "2026-07-30T08:00:00.000Z",
  },
  {
    id: "mock-task-5",
    title: "Kiểm thử luồng Auto-Tasking",
    description: "Xác nhận AI gán đúng người và output đúng JSON schema.",
    status: "todo",
    priority: "medium",
    assigneeId: "dev-3",
    assigneeName: "Vinh",
    assigneeAvatarUrl: null,
    requiredSkills: ["OpenAI", "QA"],
    dueAt: "2026-08-06T10:00:00.000Z",
    createdAt: "2026-07-31T08:00:00.000Z",
    updatedAt: "2026-07-31T08:00:00.000Z",
  },
];

export function createMockKanbanData(): KanbanBoardData {
  return {
    projectId: "demo",
    projectName: "Nexus AI · Hackathon Sprint",
    documentSummary:
      "Xây dựng Nexus AI, một workspace quản lý dự án kết hợp AI Auto-Tasking, Knowledge RAG, Kanban và EQ Radar cho đội sinh viên làm đồ án.",
    tasks: initialTasks,
    members: mockKanbanMembers,
    canAutoTask: true,
    dataSource: "mock",
  };
}
