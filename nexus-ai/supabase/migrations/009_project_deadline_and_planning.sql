-- Migration: Add deadline_at column to projects table
alter table public.projects add column if not exists deadline_at timestamp with time zone;

notify pgrst, 'reload schema';
