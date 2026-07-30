-- Minimal onboarding fields for DEV-01 onboarding integration.

alter table public.users
  add column if not exists email text,
  add column if not exists cv_text text,
  add column if not exists onboarding_completed boolean not null default false,
  add column if not exists eq_summary jsonb not null default '{}'::jsonb,
  add column if not exists updated_at timestamp with time zone not null default now();

create index if not exists users_email_idx on public.users (lower(email));

create or replace function public.build_eq_summary(eq_answers jsonb)
returns jsonb
language plpgsql
immutable
as $$
begin
  return jsonb_build_object(
    'bug_handling', coalesce(eq_answers ->> 'q1_bugHandling', ''),
    'task_preference', coalesce(eq_answers ->> 'q2_taskPreference', ''),
    'communication', coalesce(eq_answers ->> 'q3_communication', ''),
    'conflict_resolution', coalesce(eq_answers ->> 'q4_conflictResolution', ''),
    'feedback_handling', coalesce(eq_answers ->> 'q5_feedbackHandling', ''),
    'summary', 'Rule-based MVP EQ profile generated from onboarding answers.',
    'generated_by', 'dev_01_rule_based_mvp'
  );
end;
$$;

notify pgrst, 'reload schema';
