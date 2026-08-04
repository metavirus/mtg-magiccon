\set ON_ERROR_STOP on
select current_database() = 'postgres' as harmless_connection_ok;
select relrowsecurity as rls_enabled from pg_class where oid = 'public.personal_notes'::regclass;
select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'personal_notes' order by policyname;
select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'personal_notes' and grantee in ('anon', 'authenticated') order by grantee, privilege_type;

select c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('sources', 'source_observations', 'occurrences', 'personal_decisions', 'itinerary_entries')
order by c.relname;

select tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
  and tablename in ('sources', 'source_observations', 'occurrences', 'personal_decisions', 'itinerary_entries')
group by tablename
order by tablename;

select table_name, grantee, array_agg(privilege_type order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('sources', 'source_observations', 'occurrences', 'personal_decisions', 'itinerary_entries')
  and grantee in ('anon', 'authenticated')
group by table_name, grantee
order by table_name, grantee;
