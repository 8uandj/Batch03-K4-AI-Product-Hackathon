import type {
  AiRecommendationType,
  ChatRoomType,
  MessageSenderType,
  ProjectRole,
  RiskEventType,
  RiskSeverity,
} from "@/types";

export interface WorkspaceMemberProfile {
  id: string;
  name: string;
  role: ProjectRole;
  skills: string[];
  eqSignal: string;
  workload: number;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  progress: number;
  documentsIndexed: number;
  activeTasks: number;
  members: WorkspaceMemberProfile[];
  deadlineAt?: string | null;
}

export interface WorkspaceInvite {
  id: string;
  email: string;
  role: ProjectRole;
  status: "pending" | "accepted";
}

export interface WorkspaceRecommendation {
  id: string;
  type: AiRecommendationType;
  title: string;
  member: string;
  rationale: string;
  confidence: number;
}

export interface WorkspaceRiskEvent {
  id: string;
  type: RiskEventType;
  severity: RiskSeverity;
  summary: string;
  owner: string;
}

export interface WorkspaceMessage {
  id: string;
  roomType: ChatRoomType;
  senderType: MessageSenderType;
  senderName: string;
  content: string;
  createdAt: string;
}
