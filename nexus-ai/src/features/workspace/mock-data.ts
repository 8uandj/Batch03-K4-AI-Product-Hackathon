import type {
  WorkspaceInvite,
  WorkspaceMessage,
  WorkspaceProject,
  WorkspaceRecommendation,
  WorkspaceRiskEvent,
} from "./types";

export const mockWorkspaceProject: WorkspaceProject = {
  id: "demo",
  name: "Nexus AI MVP",
  description:
    "Workspace quản lý dự án kiểu Jira với AI đồng hành cho RAG, chia task và team health.",
  progress: 42,
  documentsIndexed: 8,
  activeTasks: 12,
  members: [
    {
      id: "pm-01",
      name: "PM",
      role: "pm",
      skills: ["Product", "Planning", "Stakeholder"],
      eqSignal: "Điều phối tốt, cần dashboard rõ để ra quyết định nhanh.",
      workload: 64,
    },
    {
      id: "dev-rag",
      name: "Dev RAG",
      role: "member",
      skills: ["RAG", "Supabase", "OpenAI"],
      eqSignal: "Mạnh về backend/AI, cần contract DB ổn định.",
      workload: 72,
    },
    {
      id: "dev-ui",
      name: "Dev UI",
      role: "member",
      skills: ["React", "Tailwind", "UX"],
      eqSignal: "Mạnh giao diện, dễ bị block nếu scope thay đổi muộn.",
      workload: 58,
    },
  ],
};

export const mockInvites: WorkspaceInvite[] = [
  {
    id: "invite-01",
    email: "member.a@nexus.local",
    role: "member",
    status: "pending",
  },
  {
    id: "invite-02",
    email: "mentor@nexus.local",
    role: "pm",
    status: "accepted",
  },
];

export const mockRecommendations: WorkspaceRecommendation[] = [
  {
    id: "rec-01",
    type: "task_assignment",
    title: "Giao phần ingestion tài liệu cho Dev RAG",
    member: "Dev RAG",
    rationale:
      "Profile có kỹ năng Supabase/OpenAI và đang sở hữu module document-rag.",
    confidence: 88,
  },
  {
    id: "rec-02",
    type: "coaching",
    title: "Nhắc PM chốt contract trước khi thêm feature",
    member: "PM",
    rationale:
      "Các branch đang lệch schema, cần giảm rủi ro merge bằng API contract chung.",
    confidence: 92,
  },
];

export const mockRiskEvents: WorkspaceRiskEvent[] = [
  {
    id: "risk-01",
    type: "overdue",
    severity: "high",
    summary: "Task Doing quá 48 giờ cần được PM kiểm tra blocker.",
    owner: "Dev RAG",
  },
  {
    id: "risk-02",
    type: "conflict",
    severity: "medium",
    summary: "Team Chat có dấu hiệu hiểu khác nhau về route Bot Chat và Team Chat.",
    owner: "Team",
  },
];

export const mockTeamMessages: WorkspaceMessage[] = [
  {
    id: "msg-01",
    roomType: "team",
    senderType: "user",
    senderName: "PM",
    content: "Mọi người update trạng thái theo route/project context mới nhé.",
    createdAt: "09:15",
  },
  {
    id: "msg-02",
    roomType: "team",
    senderType: "user",
    senderName: "Dev RAG",
    content: "Em cần schema documents ổn định trước khi bật Supabase mode.",
    createdAt: "09:18",
  },
  {
    id: "msg-03",
    roomType: "team",
    senderType: "assistant",
    senderName: "Nexus Bot",
    content:
      "Mình đề xuất chốt contract documents/project_members trước, sau đó mới nghiệm thu RAG production.",
    createdAt: "09:19",
  },
];
