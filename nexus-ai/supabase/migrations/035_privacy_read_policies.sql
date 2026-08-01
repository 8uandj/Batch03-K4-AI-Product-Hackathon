-- Privacy hardening: behavioral aggregates and AI telemetry are not a
-- project-wide member directory. PMs may review team-level signals; members
-- may review only their own behavioral aggregates.

drop policy if exists "Project members can read assignment decisions" on public.assignment_decisions;
drop policy if exists "PMs can read assignment decisions" on public.assignment_decisions;
create policy "PMs can read assignment decisions"
  on public.assignment_decisions for select
  to authenticated
  using (public.is_project_pm(project_id));

drop policy if exists "Project members can read agent runs" on public.agent_runs;
drop policy if exists "PMs can read project agent runs" on public.agent_runs;
create policy "PMs can read project agent runs"
  on public.agent_runs for select
  to authenticated
  using (project_id is not null and public.is_project_pm(project_id));

drop policy if exists "Project members can read activity aggregates" on public.member_activity_daily;
drop policy if exists "PMs can read team activity aggregates" on public.member_activity_daily;
drop policy if exists "Members can read own activity aggregates" on public.member_activity_daily;
create policy "PMs can read team activity aggregates"
  on public.member_activity_daily for select
  to authenticated
  using (public.is_project_pm(project_id));
create policy "Members can read own activity aggregates"
  on public.member_activity_daily for select
  to authenticated
  using (user_id = auth.uid() and public.is_project_member(project_id));

notify pgrst, 'reload schema';
