-- Neal Guides Vault: close the Supabase advisor warning on rls_auto_enable().
--
-- public.rls_auto_enable() is Supabase's own event-trigger function (created
-- with the project) that turns on RLS for every new table in public. It is
-- SECURITY DEFINER and was executable by anon/authenticated through
-- /rest/v1/rpc. Postgres refuses to run an event-trigger function when it is
-- called directly, so this was not exploitable, but nobody needs to call it:
-- the event trigger keeps working without these grants.
-- Guarded, so it is a no-op on databases where the function doesn't exist.

do $$
begin
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'rls_auto_enable' and p.pronargs = 0
  ) then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;
