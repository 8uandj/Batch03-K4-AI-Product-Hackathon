-- Allow a member to delete only their own behavioral aggregates.
drop policy if exists "Members can delete own activity aggregates" on public.member_activity_daily;
create policy "Members can delete own activity aggregates"
  on public.member_activity_daily for delete to authenticated
  using (user_id = auth.uid() and public.is_project_member(project_id));

notify pgrst, 'reload schema';
