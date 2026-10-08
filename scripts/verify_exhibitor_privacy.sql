-- Transactional regression: no test records survive this check.
begin;
select set_config('test.owner', (select user_id::text from public.companion_members where active order by user_id limit 1), true);
select set_config('test.other', (select user_id::text from public.companion_members where active order by user_id offset 1 limit 1), true);
do $$ begin
  if nullif(current_setting('test.other'), '') is null then raise exception 'Two companions required'; end if;
  if not (select relrowsecurity from pg_class where oid='public.exhibitor_directory'::regclass) then raise exception 'Directory RLS missing'; end if;
  if has_table_privilege('anon','public.exhibitor_directory','select') or has_table_privilege('authenticated','public.exhibitor_directory','insert') then raise exception 'Directory grants too broad'; end if;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.owner'),true);
set local role authenticated;
insert into public.personal_notes(owner_id,title,body,object_id,object_kind,object_title,context,visibility,backlink,author_label)
values(auth.uid(),'Privacy regression','','exhibitor-privacy-regression','exhibitor','Privacy regression','Exhibitor','private','Info','Kavi');
insert into public.user_selections(owner_id,object_id,object_kind,selection_key,selection_value)
values(auth.uid(),'exhibitor-privacy-regression','exhibitor','saved','true');
do $$ begin
  if (select count(*) from public.personal_notes where object_id='exhibitor-privacy-regression') <> 1 then raise exception 'Owner note read failed'; end if;
  if (select count(*) from public.user_selections where object_id='exhibitor-privacy-regression') <> 1 then raise exception 'Owner save read failed'; end if;
  begin
    update public.personal_notes set visibility='shared' where object_id='exhibitor-privacy-regression';
    raise exception 'Shared exhibitor note was allowed';
  exception when check_violation then null; end;
end $$;
select set_config('request.jwt.claim.sub',current_setting('test.other'),true);
do $$ begin
  if exists(select 1 from public.personal_notes where object_id='exhibitor-privacy-regression') then raise exception 'Other companion can read private note'; end if;
  if exists(select 1 from public.user_selections where object_id='exhibitor-privacy-regression') then raise exception 'Other companion can read save'; end if;
end $$;
reset role;
rollback;
select 'Exhibitor privacy regression PASS; test writes rolled back' as result;
