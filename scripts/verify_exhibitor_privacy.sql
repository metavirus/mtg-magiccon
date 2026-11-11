-- Transactional regression: no test records survive this check.
begin;
do $$ begin
  perform set_config('test.owner', (select user_id::text from public.companion_members where active and user_id is not null order by user_id limit 1), true);
  perform set_config('test.other', (select user_id::text from public.companion_members where active and user_id is not null order by user_id offset 1 limit 1), true);
  perform set_config('test.other_key', (select person_key from public.companion_members where user_id::text = current_setting('test.other')), true);
  if nullif(current_setting('test.other'), '') is null then raise exception 'Two companions required'; end if;
  if not (select relrowsecurity from pg_class where oid='public.exhibitor_directory'::regclass) then raise exception 'Directory RLS missing'; end if;
  if has_table_privilege('anon','public.exhibitor_directory','select') or has_table_privilege('authenticated','public.exhibitor_directory','insert') then raise exception 'Directory grants too broad'; end if;
end $$;
do $$ begin perform set_config('request.jwt.claim.sub',current_setting('test.owner'),true); end $$;
set local role authenticated;
insert into public.personal_notes(owner_id,title,body,object_id,object_kind,object_title,context,visibility,backlink,author_label)
values(auth.uid(),'Privacy regression','','exhibitor-privacy-regression','exhibitor','Privacy regression','Exhibitor','private','Info','Kavi');
insert into public.personal_notes(owner_id,title,body,object_id,object_kind,object_title,context,visibility,backlink,author_label)
values(auth.uid(),'Sharing regression','@companion','exhibitor-sharing-regression','exhibitor','Sharing regression','Exhibitor','shared','Info','Kavi');
insert into public.note_mentions(note_id,note_owner_id,mentioned_person_key,mentioned_user_id,mention_token)
select id, auth.uid(), current_setting('test.other_key'), current_setting('test.other')::uuid, '@companion'
from public.personal_notes where owner_id = auth.uid() and object_id = 'exhibitor-sharing-regression';
insert into public.user_selections(owner_id,object_id,object_kind,selection_key,selection_value)
values(auth.uid(),'exhibitor-privacy-regression','exhibitor','saved','true');
do $$ begin
  if (select count(*) from public.personal_notes where object_id='exhibitor-privacy-regression') <> 1 then raise exception 'Owner note read failed'; end if;
  if (select count(*) from public.user_selections where object_id='exhibitor-privacy-regression') <> 1 then raise exception 'Owner save read failed'; end if;
end $$;
do $$ begin perform set_config('request.jwt.claim.sub',current_setting('test.other'),true); end $$;
do $$ begin
  if exists(select 1 from public.personal_notes where object_id='exhibitor-privacy-regression') then raise exception 'Other companion can read private note'; end if;
  if exists(select 1 from public.user_selections where object_id='exhibitor-privacy-regression') then raise exception 'Other companion can read save'; end if;
  if not exists(select 1 from public.note_mentions m join public.personal_notes n on n.id = m.note_id where n.object_id = 'exhibitor-sharing-regression' and m.mentioned_user_id = auth.uid()) then raise exception 'Mention recipient cannot read shared note'; end if;
end $$;
do $$ begin
  perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  if exists(select 1 from public.personal_notes where object_id='exhibitor-sharing-regression') then raise exception 'Non-companion can read shared exhibitor note'; end if;
end $$;
reset role;
rollback;
select 'Exhibitor privacy regression PASS; test writes rolled back' as result;
