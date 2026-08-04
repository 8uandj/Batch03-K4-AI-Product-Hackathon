-- Task deletion is a project-management operation on the Team board.
drop policy if exists "Project members can delete regular tasks" on public.tasks;
drop policy if exists "Project PM can delete tasks" on public.tasks;

create policy "Project PM can delete tasks"
  on public.tasks for delete
  to authenticated
  using (project_id is not null and public.is_project_pm(project_id));

notify pgrst, 'reload schema';
