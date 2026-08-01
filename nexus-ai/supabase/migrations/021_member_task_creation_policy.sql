-- Project-level opt-in for member-created ad-hoc tasks.
alter table public.projects
  add column if not exists allow_member_task_creation boolean not null default false;

notify pgrst, 'reload schema';
