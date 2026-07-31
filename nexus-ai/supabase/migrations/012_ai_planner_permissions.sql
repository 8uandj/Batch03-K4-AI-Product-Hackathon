-- RLS policies to allow project PMs to manage AI recommendations.
drop policy if exists "PM can manage AI recommendations"
  on public.ai_recommendations;

create policy "PM can manage AI recommendations"
  on public.ai_recommendations for all
  to authenticated
  using (public.is_project_pm(project_id))
  with check (public.is_project_pm(project_id));

notify pgrst, 'reload schema';
