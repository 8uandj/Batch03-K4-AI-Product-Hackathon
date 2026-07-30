export type TaskStatus = 'todo' | 'doing' | 'done';
export type ProjectRole = 'pm' | 'member';
export type ProjectStatus = 'active' | 'archived';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';
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
  due_at: string | null;
  updated_at: string;
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
        OptionalGenerated<Project, 'id' | 'status' | 'created_at' | 'updated_at'>,
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
          'id' | 'project_id' | 'description' | 'status' | 'priority' | 'due_at' | 'updated_at' | 'created_at'
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
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
