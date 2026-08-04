-- Supabase may install pgcrypto functions in the extensions schema. Functions
-- with `set search_path = public` cannot resolve an unqualified
-- gen_random_bytes(), which broke both UUID and invite-link joining when the
-- profile bootstrap generated a user code.

alter table public.project_invites
  alter column token set default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

create or replace function public.generate_user_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := 'NX-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (select 1 from public.users where user_code = candidate);
  end loop;

  return candidate;
end;
$$;

grant execute on function public.generate_user_code() to authenticated;
notify pgrst, 'reload schema';
