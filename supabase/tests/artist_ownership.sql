-- Read-only assertions under real authenticated roles; always rolled back.
begin;
select set_config('test.artist_owner', (select id::text from auth.users where lower(email) = 'kavigrace@gmail.com'), true);
select set_config('test.artist_other', (select id::text from auth.users where lower(email) <> 'kavigrace@gmail.com' order by id limit 1), true);
do $$ begin
  if nullif(current_setting('test.artist_owner'), '') is null or nullif(current_setting('test.artist_other'), '') is null then
    raise exception 'Two existing identities required for artist RLS proof'; end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('test.artist_owner'), true);
set local role authenticated;
do $$ begin
  if (select count(*) from public.artist_collection_inventory) = 0
    or (select count(*) from public.artist_card_assessments) = 0
    or (select count(*) from public.artist_import_batches) = 0 then
    raise exception 'Owner cannot read migrated artist data'; end if;
  if exists(select 1 from public.artist_collection_inventory where owner_id <> auth.uid()) then
    raise exception 'Foreign holdings leaked to owner'; end if;
  if has_table_privilege('authenticated','public.artist_collection_inventory','INSERT')
    or has_table_privilege('authenticated','public.artist_collection_inventory','UPDATE')
    or has_table_privilege('authenticated','public.artist_collection_inventory','DELETE')
    or has_table_privilege('anon','public.artist_collection_inventory','SELECT') then
    raise exception 'Inventory grants exceed owner-read/privileged-import contract'; end if;
end $$;
select set_config('request.jwt.claim.sub', current_setting('test.artist_other'), true);
do $$ begin
  if exists(select 1 from public.artist_collection_inventory where owner_id = current_setting('test.artist_owner')::uuid)
    or exists(select 1 from public.artist_collection_profiles where owner_id = current_setting('test.artist_owner')::uuid)
    or exists(select 1 from public.artist_card_assessments where owner_id = current_setting('test.artist_owner')::uuid)
    or exists(select 1 from public.artist_import_batches where owner_id = current_setting('test.artist_owner')::uuid)
    or exists(select 1 from public.artist_signing_interests where owner_id = current_setting('test.artist_owner')::uuid) then
    raise exception 'Other authenticated user can read Kavi private artist data'; end if;
  if not exists(select 1 from public.artists) or not exists(select 1 from public.artist_card_printings) then
    raise exception 'Shared artist/printing directory incorrectly hidden'; end if;
end $$;
rollback;
