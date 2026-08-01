-- Delete only the requesting member's behavioral aggregates and derived
-- conflict signals. Raw chat content is never stored by NexusAI.
create or replace function public.delete_member_behavioral_data(target_project_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  aggregate_count integer;
  conflict_count integer;
begin
  if auth.uid() is null or not public.is_project_member(target_project_id) then
    raise exception 'Project membership required' using errcode = '42501';
  end if;

  delete from public.member_activity_daily
  where project_id = target_project_id and user_id = auth.uid();
  get diagnostics aggregate_count = row_count;

  delete from public.risk_events
  where project_id = target_project_id
    and user_id = auth.uid()
    and type = 'conflict';
  get diagnostics conflict_count = row_count;

  return jsonb_build_object(
    'aggregates_deleted', aggregate_count,
    'derived_conflict_events_deleted', conflict_count
  );
end;
$$;

revoke all on function public.delete_member_behavioral_data(uuid) from public;
grant execute on function public.delete_member_behavioral_data(uuid) to authenticated;

notify pgrst, 'reload schema';
