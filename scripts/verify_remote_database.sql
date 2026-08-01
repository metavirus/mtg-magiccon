\set ON_ERROR_STOP on
select current_database() = 'postgres' as harmless_connection_ok;
select relrowsecurity as rls_enabled from pg_class where oid = 'public.personal_notes'::regclass;
select policyname, cmd, roles, qual, with_check from pg_policies where schemaname = 'public' and tablename = 'personal_notes' order by policyname;
select grantee, privilege_type from information_schema.role_table_grants where table_schema = 'public' and table_name = 'personal_notes' and grantee in ('anon', 'authenticated') order by grantee, privilege_type;
