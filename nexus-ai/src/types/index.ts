export type TaskStatus = 'todo' | 'doing' | 'done';

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface User {
  id: string;
  name: string | null;
  skills: string[];
  eq_answers: Json;
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
  title: string;
  status: TaskStatus;
  assignee_id: string;
  updated_at: string;
  created_at: string;
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Partial<Omit<User, 'id' | 'created_at'>> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<User, 'id'>>;
        Relationships: [];
      };
      documents: {
        Row: Document;
        Insert: Partial<
          Omit<
            Document,
            | 'id'
            | 'source_id'
            | 'chunk_index'
            | 'filename'
            | 'metadata'
            | 'created_at'
          >
        > & {
          id?: string;
          project_id: string;
          source_id?: string;
          filename?: string;
          chunk_index?: number;
          content: string;
          embedding: number[];
          metadata?: Json;
          created_at?: string;
        };
        Update: Partial<Omit<Document, 'id'>>;
        Relationships: [];
      };
      tasks: {
        Row: Task;
        Insert: Partial<
          Omit<Task, 'id' | 'status' | 'updated_at' | 'created_at'>
        > & {
          id?: string;
          status?: TaskStatus;
          updated_at?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Task, 'id'>>;
        Relationships: [
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
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
