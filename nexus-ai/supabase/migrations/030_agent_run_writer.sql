-- Write agent telemetry through a server-side RPC so authenticated route clients
-- cannot silently lose logs to agent_runs RLS and cannot spoof another project.
create or replace function public.record_agent_run(
  run_project_id uuid,
  run_agent text,
  run_tier text,
  run_model text default null,
  run_status text default 'success',
  run_latency_ms integer default null,
  run_input_tokens integer default null,
  run_output_tokens integer default null,
  run_fallback boolean default false,
  run_error text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_id uuid;
  is_service_role boolean := coalesce(auth.jwt()->>'role', '') = 'service_role';
begin
  if auth.uid() is null and not is_service_role then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if run_project_id is null and not is_service_role then
    raise exception 'Global agent runs require service role' using errcode = '42501';
  end if;
  if run_project_id is not null and not is_service_role and not public.is_project_member(run_project_id) then
    raise exception 'Project membership required' using errcode = '42501';
  end if;
  if run_agent not in ('knowledge', 'auto_tasking', 'deadline', 'eq_radar') then
    raise exception 'Invalid agent' using errcode = '23514';
  end if;
  if run_tier not in ('tier1', 'tier2', 'rule') then
    raise exception 'Invalid agent tier' using errcode = '23514';
  end if;
  if run_status not in ('success', 'fallback', 'error') then
    raise exception 'Invalid agent status' using errcode = '23514';
  end if;

  insert into public.agent_runs (
    project_id, agent, tier, model, status, latency_ms, input_tokens,
    output_tokens, fallback, error
  ) values (
    run_project_id, run_agent, run_tier, nullif(left(run_model, 120), ''),
    run_status, greatest(run_latency_ms, 0), greatest(run_input_tokens, 0),
    greatest(run_output_tokens, 0), coalesce(run_fallback, false),
    nullif(left(run_error, 2000), '')
  ) returning id into created_id;
  return created_id;
end;
$$;

revoke all on function public.record_agent_run(uuid, text, text, text, text, integer, integer, integer, boolean, text) from public;
grant execute on function public.record_agent_run(uuid, text, text, text, text, integer, integer, integer, boolean, text) to authenticated;
grant execute on function public.record_agent_run(uuid, text, text, text, text, integer, integer, integer, boolean, text) to service_role;

notify pgrst, 'reload schema';
