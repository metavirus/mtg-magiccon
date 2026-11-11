-- Finite transactional proof: all synthetic rows roll back, including failures.
-- Run with psql -v ON_ERROR_STOP=1 -f <this file> after applying the migration.
begin;
do $$
#variable_conflict use_variable
declare
  members uuid[];
  owner_id uuid;
  invited_id uuid;
  stranger_id uuid;
  invited_key text;
  stranger_key text;
  event_id uuid := gen_random_uuid();
  note_id uuid := gen_random_uuid();
  private_note_id uuid := gen_random_uuid();
  ordinary_note_id uuid := gen_random_uuid();
  affected integer;
begin
  select array_agg(user_id order by sort_order) into members from public.companion_members where active and user_id is not null;
  if cardinality(members) < 3 then raise exception 'Need three existing active companion identities for RLS proof'; end if;
  owner_id := members[1]; invited_id := members[2]; stranger_id := members[3];
  select person_key into invited_key from public.companion_members where user_id=invited_id;
  select person_key into stranger_key from public.companion_members where user_id=stranger_id;
  if has_table_privilege('anon', 'public.personal_calendar_events', 'SELECT') then raise exception 'Anonymous event grant'; end if;
  if not (select relrowsecurity and relforcerowsecurity from pg_class where oid='public.personal_calendar_events'::regclass) then raise exception 'Missing forced RLS'; end if;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  set local role authenticated;
  insert into public.personal_calendar_events(id, owner_id, title, event_date, start_time, end_time, invited_user_ids)
    values(event_id, owner_id, 'RLS rollback proof', '2099-11-13', '18:00', '19:00', array[invited_id]);
  if not exists(select 1 from public.personal_calendar_events where id=event_id and visibility='private') then raise exception 'Private default or owner read failed'; end if;
  begin
    update public.personal_calendar_events set end_time='17:00' where id=event_id;
    raise exception 'Time ordering accepted';
  exception when check_violation then null; end;
  begin
    update public.personal_calendar_events set invited_user_ids=array[gen_random_uuid()] where id=event_id;
    raise exception 'Unknown invitation accepted';
  exception when insufficient_privilege then null; end;
  begin
    update public.personal_calendar_events set owner_id=invited_id where id=event_id;
    raise exception 'Owner transfer accepted';
  exception when insufficient_privilege then null; end;
  insert into public.personal_notes(id,owner_id,title,body,object_id,object_kind,object_title,context,visibility,backlink,author_label)
    values(note_id,owner_id,'RLS proof','Shared event note','personal-calendar:'||event_id,'event','RLS proof','Calendar','shared','calendar','Kavi'),
          (private_note_id,owner_id,'RLS proof','Private author note','personal-calendar:'||event_id,'event','RLS proof','Calendar','private','calendar','Kavi'),
          (ordinary_note_id,owner_id,'RLS proof','Ordinary shared note','general','note','RLS proof','Notes','shared','notes','Kavi');
  insert into public.note_mentions(note_id,note_owner_id,mentioned_person_key,mentioned_user_id,mention_token)
    values(note_id,owner_id,invited_key,invited_id,'@Invited'),
          (note_id,owner_id,stranger_key,stranger_id,'@Stranger'),
          (private_note_id,owner_id,invited_key,invited_id,'@Invited'),
          (ordinary_note_id,owner_id,stranger_key,stranger_id,'@Stranger');

  perform set_config('request.jwt.claim.sub', invited_id::text, true);
  if not exists(select 1 from public.personal_calendar_events where id=event_id) then raise exception 'Invited private event denied'; end if;
  if not exists(select 1 from public.personal_notes where id=note_id) then raise exception 'Invited shared event note denied'; end if;
  if exists(select 1 from public.personal_notes where id=private_note_id) then raise exception 'Author-private note leaked'; end if;
  if not exists(select 1 from public.note_mentions where note_mentions.mentioned_user_id=invited_id and note_mentions.note_id=note_id) then raise exception 'Invited mention missing'; end if;
  if exists(select 1 from public.note_mentions where note_mentions.note_id=private_note_id) then raise exception 'Private-note mention metadata leaked'; end if;
  update public.personal_calendar_events set title='Illegal edit' where id=event_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Invited edit allowed'; end if;
  delete from public.personal_calendar_events where id=event_id;
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Invited removal allowed'; end if;

  perform set_config('request.jwt.claim.sub', stranger_id::text, true);
  if exists(select 1 from public.personal_calendar_events where id=event_id) then raise exception 'Private event leaked'; end if;
  if exists(select 1 from public.personal_notes where id=note_id) then raise exception 'Private event note leaked'; end if;
  if exists(select 1 from public.note_mentions where note_mentions.note_id=note_id) then raise exception 'Private event mention leaked'; end if;
  if not exists(select 1 from public.personal_notes where id=ordinary_note_id) then raise exception 'Ordinary shared note denied'; end if;
  if not exists(select 1 from public.note_mentions where note_mentions.note_id=ordinary_note_id) then raise exception 'Ordinary shared mention denied'; end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  update public.personal_calendar_events set visibility='shared' where id=event_id;
  perform set_config('request.jwt.claim.sub', stranger_id::text, true);
  if not exists(select 1 from public.personal_calendar_events where id=event_id) then raise exception 'Shared event denied'; end if;
  if not exists(select 1 from public.personal_notes where id=note_id) then raise exception 'Shared event note denied'; end if;
  perform set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  if exists(select 1 from public.personal_calendar_events where id=event_id) then raise exception 'Noncompanion shared event leaked'; end if;

  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  update public.personal_calendar_events set visibility='private', invited_user_ids='{}' where id=event_id;
  perform set_config('request.jwt.claim.sub', invited_id::text, true);
  if exists(select 1 from public.personal_notes where id=note_id) then raise exception 'Revoked invitation retained note access'; end if;
  perform set_config('request.jwt.claim.sub', owner_id::text, true);
  delete from public.personal_calendar_events where id=event_id;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'Owner removal failed'; end if;
  if exists(select 1 from public.personal_notes where id=note_id) then raise exception 'Deleted event left readable note'; end if;
  reset role;
  raise notice 'PASS: personal calendar owner, invite, shared, note/mention privacy, revocation, time validation, deletion';
end $$;
rollback;
