-- Return only the privacy flags needed to render team-level workload guidance.
-- PMs must not read members' full preference rows (especially chat opt-in), but
-- the server needs to know whether behavioral/late-night aggregates are
-- eligible for delegation and dashboard calculations.
create or replace function public.get_project_privacy_flags(target_project_id uuid)
returns table (
  user_id uuid,
  behavioral_insights_enabled boolean,
  late_night_signal_enabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_project_pm(target_project_id) then
    raise exception 'Only project PM can read team privacy flags' using errcode = '42501';
  end if;

  return query
  select
    members.user_id,
    coalesce(preferences.behavioral_insights_enabled, true),
    coalesce(preferences.late_night_signal_enabled, true)
  from public.project_members members
  left join public.member_ai_preferences preferences
    on preferences.project_id = members.project_id
   and preferences.user_id = members.user_id
  where members.project_id = target_project_id;
end;
$$;

revoke all on function public.get_project_privacy_flags(uuid) from public;
grant execute on function public.get_project_privacy_flags(uuid) to authenticated;

notify pgrst, 'reload schema';
