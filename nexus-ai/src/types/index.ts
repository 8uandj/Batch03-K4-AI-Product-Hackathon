export type TaskStatus = 'todo' | 'doing' | 'rework' | 'done';
export type ProjectRole = 'pm' | 'member';
export type ProjectStatus = 'active' | 'archived';
export type InviteStatus = 'pending' | 'awaiting_approval' | 'accepted' | 'revoked' | 'expired';
export type ChatRoomType = 'team' | 'bot';
export type MessageSenderType = 'user' | 'assistant' | 'system';
export type AiSummaryType = 'project_brief' | 'member_insight' | 'team_health';
export type AiRecommendationType =
  | 'task_assignment'
  | 'coaching'
  | 'conflict_resolution';
export type AiRecommendationStatus = 'suggested' | 'accepted' | 'dismissed';
export type RiskEventType = 'overdue' | 'overload' | 'conflict' | 'burnout_signal';
export type RiskSeverity = 'low' | 'medium' | 'high';
export type TaskPriority = 'low' | 'medium' | 'high';
export type DeadlineNotificationKind =
  | 'assignee_check_in'
  | 'leader_escalation'
  | 'force_assign_followup'
  | 'force_assign_warning';
export type TaskOrigin = 'ai_planned' | 'manual' | 'ad_hoc' | 'rework';
export type TaskSourceType = 'feedback_change' | 'bug_fix' | 'urgent_request' | 'admin_logistics' | 'other';
export type TaskEffortSize = 'small' | 'medium' | 'large';
export type AssignmentPhase = 'normal' | 'sprint' | 'emergency';
export type AssignmentRisk = 'low' | 'moderate' | 'high' | 'critical';
export type AgentName = 'knowledge' | 'auto_tasking' | 'deadline' | 'eq_radar';
export type ModelTier = 'tier1' | 'tier2' | 'rule';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface User {
  id: string;
  user_code: string | null;
  email: string | null;
  avatar_url: string | null;
  name: string | null;
  bio: string | null;
  skills: string[];
  cv_url: string | null;
  cv_text: string | null;
  eq_answers: Json;
  eq_summary: Json;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  status: ProjectStatus;
  deadline_at: string | null;
  allow_member_task_creation: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  email: string;
  role: ProjectRole;
  token: string;
  status: InviteStatus;
  expires_at: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  project_id: string;
  source_id: string;
  filename: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  metadata: Json;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_id: string;
  required_skills: string[];
  due_at: string | null;
  origin: TaskOrigin;
  source_type: TaskSourceType | null;
  source_task_id: string | null;
  created_by: string | null;
  effort_size: TaskEffortSize;
  is_urgent: boolean;
  acceptance_criteria: string | null;
  blocked_by_task_id?: string | null;
  updated_at: string;
  created_at: string;
}

export interface TaskActivityEvent {
  id: string;
  project_id: string;
  task_id: string;
  actor_id: string | null;
  event_type: string;
  from_value: string | null;
  to_value: string | null;
  metadata: Json;
  occurred_at: string;
}

export interface AssignmentDecision {
  id: string;
  project_id: string;
  task_id: string | null;
  actor_id: string;
  suggested_user_id: string | null;
  selected_user_id: string | null;
  project_phase: AssignmentPhase;
  risk_level: AssignmentRisk;
  weights: Json;
  evidence: Json;
  override_reason: string | null;
  mitigation: string | null;
  created_at: string;
}

export interface AgentRun {
  id: string;
  project_id: string | null;
  agent: string;
  tier: "tier1" | "tier2" | "rule";
  model: string | null;
  status: "success" | "fallback" | "error";
  latency_ms: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  fallback: boolean;
  error: string | null;
  created_at: string;
}

export interface MemberActivityDaily {
  id: string;
  project_id: string;
  user_id: string;
  activity_date: string;
  open_tasks: number;
  doing_tasks: number;
  overdue_tasks: number;
  stale_doing_tasks: number;
  reminder_count: number;
  completed_tasks: number;
  late_night_updates: number;
  created_at: string;
}

export interface MemberAiPreference {
  user_id: string;
  project_id: string;
  behavioral_insights_enabled: boolean;
  late_night_signal_enabled: boolean;
  chat_analysis_enabled: boolean;
  timezone: string;
  updated_at: string;
}

export interface AssignmentFollowup {
  id: string;
  project_id: string;
  task_id: string;
  member_id: string;
  created_by: string;
  override_reason: string;
  mitigation: string;
  due_at: string;
  notified_at: string | null;
  status: "open" | "resolved";
  resolved_at: string | null;
  created_at: string;
}

export interface ChatRoom {
  id: string;
  project_id: string;
  type: ChatRoomType;
  name: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string | null;
  sender_type: MessageSenderType;
  content: string;
  metadata: Json;
  created_at: string;
}

export interface AiSummary {
  id: string;
  project_id: string;
  type: AiSummaryType;
  title: string;
  content: string;
  metadata: Json;
  created_at: string;
}

export interface AiRecommendation {
  id: string;
  project_id: string;
  type: AiRecommendationType;
  target_user_id: string | null;
  title: string;
  rationale: string;
  payload: Json;
  status: AiRecommendationStatus;
  created_at: string;
}

export interface RiskEvent {
  id: string;
  project_id: string;
  user_id: string | null;
  task_id: string | null;
  type: RiskEventType;
  severity: RiskSeverity;
  summary: string;
  metadata: Json;
  resolved_at: string | null;
  created_at: string;
}

export interface DeadlineNotification {
  id: string;
  project_id: string;
  task_id: string;
  recipient_user_id: string;
  kind: DeadlineNotificationKind;
  content: string;
  overdue_hours: number;
  notification_day: string;
  tone: "gentle" | "neutral" | "urgent";
  trigger_reason: string;
  action_link: string | null;
  read_at: string | null;
  created_at: string;
}

type TableDefinition<Row, Insert, Update, Relationships = []> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type OptionalGenerated<T, Keys extends keyof T> = Partial<Pick<T, Keys>> &
  Omit<T, Keys>;

export type Database = {
  public: {
    Tables: {
      users: TableDefinition<
        User,
        Partial<Omit<User, 'id' | 'created_at' | 'updated_at'>> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        },
        Partial<Omit<User, 'id'>>
      >;
      projects: TableDefinition<
        Project,
        OptionalGenerated<Project, 'id' | 'status' | 'deadline_at' | 'allow_member_task_creation' | 'created_at' | 'updated_at'>,
        Partial<Omit<Project, 'id'>>,
        [
          {
            foreignKeyName: 'projects_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ]
      >;
      project_members: TableDefinition<
        ProjectMember,
        OptionalGenerated<ProjectMember, 'role' | 'joined_at'>,
        Partial<ProjectMember>,
        [
          {
            foreignKeyName: 'project_members_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ]
      >;
      project_invites: TableDefinition<
        ProjectInvite,
        OptionalGenerated<ProjectInvite, 'id' | 'role' | 'token' | 'status' | 'expires_at' | 'created_at'>,
        Partial<Omit<ProjectInvite, 'id'>>,
        [
          {
            foreignKeyName: 'project_invites_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ]
      >;
      documents: TableDefinition<
        Document,
        OptionalGenerated<
          Document,
          'id' | 'source_id' | 'chunk_index' | 'filename' | 'metadata' | 'created_at'
        >,
        Partial<Omit<Document, 'id'>>,
        [
          {
            foreignKeyName: 'documents_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ]
      >;
      tasks: TableDefinition<
          Task,
          OptionalGenerated<
            Task,
          'id' | 'project_id' | 'description' | 'status' | 'priority' | 'required_skills' | 'due_at' | 'origin' | 'source_type' | 'source_task_id' | 'created_by' | 'effort_size' | 'is_urgent' | 'acceptance_criteria' | 'blocked_by_task_id' | 'updated_at' | 'created_at'
        >,
        Partial<Omit<Task, 'id'>>,
        [
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ]
      >;
      task_activity_events: TableDefinition<TaskActivityEvent, Partial<Omit<TaskActivityEvent, 'id' | 'occurred_at'>>, Partial<Omit<TaskActivityEvent, 'id'>>>;
      assignment_decisions: TableDefinition<AssignmentDecision, Partial<Omit<AssignmentDecision, 'id' | 'created_at'>>, Partial<Omit<AssignmentDecision, 'id'>>>;
      agent_runs: TableDefinition<AgentRun, Partial<Omit<AgentRun, 'id' | 'created_at'>>, Partial<Omit<AgentRun, 'id'>>>;
      member_activity_daily: TableDefinition<MemberActivityDaily, Partial<Omit<MemberActivityDaily, 'id' | 'created_at'>>, Partial<Omit<MemberActivityDaily, 'id'>>>;
      member_ai_preferences: TableDefinition<MemberAiPreference, MemberAiPreference, Partial<MemberAiPreference>>;
      assignment_followups: TableDefinition<AssignmentFollowup, Partial<Omit<AssignmentFollowup, 'id' | 'created_at'>>, Partial<Omit<AssignmentFollowup, 'id'>>>;
      chat_rooms: TableDefinition<
        ChatRoom,
        OptionalGenerated<ChatRoom, 'id' | 'created_at'>,
        Partial<Omit<ChatRoom, 'id'>>,
        [
          {
            foreignKeyName: 'chat_rooms_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ]
      >;
      chat_messages: TableDefinition<
        ChatMessage,
        OptionalGenerated<ChatMessage, 'id' | 'sender_id' | 'sender_type' | 'metadata' | 'created_at'>,
        Partial<Omit<ChatMessage, 'id'>>,
        [
          {
            foreignKeyName: 'chat_messages_room_id_fkey';
            columns: ['room_id'];
            isOneToOne: false;
            referencedRelation: 'chat_rooms';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chat_messages_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ]
      >;
      ai_summaries: TableDefinition<
        AiSummary,
        OptionalGenerated<AiSummary, 'id' | 'metadata' | 'created_at'>,
        Partial<Omit<AiSummary, 'id'>>,
        [
          {
            foreignKeyName: 'ai_summaries_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ]
      >;
      ai_recommendations: TableDefinition<
        AiRecommendation,
        OptionalGenerated<AiRecommendation, 'id' | 'target_user_id' | 'payload' | 'status' | 'created_at'>,
        Partial<Omit<AiRecommendation, 'id'>>,
        [
          {
            foreignKeyName: 'ai_recommendations_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'ai_recommendations_target_user_id_fkey';
            columns: ['target_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ]
      >;
      risk_events: TableDefinition<
        RiskEvent,
        OptionalGenerated<RiskEvent, 'id' | 'user_id' | 'task_id' | 'severity' | 'metadata' | 'resolved_at' | 'created_at'>,
        Partial<Omit<RiskEvent, 'id'>>,
        [
          {
            foreignKeyName: 'risk_events_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'risk_events_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'risk_events_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
        ]
      >;
      deadline_notifications: TableDefinition<
        DeadlineNotification,
        OptionalGenerated<
          DeadlineNotification,
          'id' | 'read_at' | 'created_at'
        >,
        Partial<
          Pick<DeadlineNotification, 'content' | 'overdue_hours' | 'read_at'>
        >,
        [
          {
            foreignKeyName: 'deadline_notifications_project_id_fkey';
            columns: ['project_id'];
            isOneToOne: false;
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deadline_notifications_task_id_fkey';
            columns: ['task_id'];
            isOneToOne: false;
            referencedRelation: 'tasks';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'deadline_notifications_recipient_user_id_fkey';
            columns: ['recipient_user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ]
      >;
    };
    Views: Record<string, never>;
    Functions: {
      create_project_with_pm: {
        Args: {
          project_name: string;
          project_description?: string | null;
        };
        Returns: string;
      };
      generate_user_code: {
        Args: Record<string, never>;
        Returns: string;
      };
      ensure_user_profile: {
        Args: Record<string, never>;
        Returns: User;
      };
      create_project_invite: {
        Args: {
          target_project_id: string;
          invitee_email?: string | null;
          invitee_user_code?: string | null;
          invite_role?: ProjectRole;
        };
        Returns: ProjectInvite;
      };
      accept_project_invite: {
        Args: {
          invite_token: string;
        };
        Returns: string;
      };
      approve_project_invite: {
        Args: {
          invite_id: string;
        };
        Returns: string;
      };
      request_project_membership: {
        Args: {
          target_project_id: string;
        };
        Returns: string;
      };
      reject_project_invite: {
        Args: {
          invite_id: string;
        };
        Returns: string;
      };
      remove_project_member: {
        Args: {
          target_project_id: string;
          target_user_id: string;
        };
        Returns: boolean;
      };
      generate_project_recommendations: {
        Args: {
          target_project_id: string;
        };
        Returns: AiRecommendation[];
      };
      match_documents: {
        Args: {
          query_embedding: number[];
          filter_project_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: Array<{
          id: string;
          filename: string;
          chunk_index: number;
          content: string;
          similarity: number;
        }>;
      };
      create_manual_task: {
        Args: { target_project_id: string; task_title: string; task_description?: string | null; task_priority: TaskPriority; target_assignee_id: string; task_skills?: string[]; task_due_at?: string | null; dependency_task_id?: string | null; task_origin: TaskOrigin; task_source_type?: TaskSourceType | null; source_task_id?: string | null; task_effort_size: TaskEffortSize; task_is_urgent: boolean; task_acceptance_criteria?: string | null; decision_input?: Json };
        Returns: Task[];
      };
      approve_auto_tasking_draft: {
        Args: { target_project_id: string; recommendation_id: string; approved_tasks: Json };
        Returns: Task[];
      };
      reassign_task: {
        Args: { target_project_id: string; target_task_id: string; target_assignee_id: string; decision_input?: Json };
        Returns: Task[];
      };
      update_task_status: {
        Args: { target_project_id: string; target_task_id: string; next_status: TaskStatus };
        Returns: Task[];
      };
      record_task_action: {
        Args: { target_project_id: string; target_task_id: string; action: "blocker_reported" | "support_requested"; note?: string | null };
        Returns: boolean;
      };
      respond_assignment_followup: {
        Args: { target_project_id: string; target_task_id: string; response_note?: string | null };
        Returns: boolean;
      };
      approve_planner_draft: {
        Args: { target_project_id: string; recommendation_id: string; approved_tasks: Json };
        Returns: Task[];
      };
      record_agent_run: {
        Args: {
          run_project_id?: string | null;
          run_agent: AgentName;
          run_tier: ModelTier;
          run_model?: string | null;
          run_status?: 'success' | 'fallback' | 'error';
          run_latency_ms?: number | null;
          run_input_tokens?: number | null;
          run_output_tokens?: number | null;
          run_fallback?: boolean;
          run_error?: string | null;
        };
        Returns: string;
      };
      record_risk_event: {
        Args: {
          target_project_id: string;
          target_user_id?: string | null;
          target_task_id?: string | null;
          event_type?: RiskEventType;
          event_severity?: RiskSeverity;
          event_summary?: string;
          event_metadata?: Json;
        };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
