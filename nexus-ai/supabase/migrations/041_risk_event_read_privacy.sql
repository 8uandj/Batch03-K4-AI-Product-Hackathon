-- Risk events are team-health signals for PM review, not a project-wide
-- member directory. Members must not read another member's derived signals.
drop policy if exists "Project members can read risk events" on public.risk_events;
drop policy if exists "PMs can read risk events" on public.risk_events;
create policy "PMs can read risk events"
  on public.risk_events for select
  to authenticated
  using (public.is_project_pm(project_id));

notify pgrst, 'reload schema';
