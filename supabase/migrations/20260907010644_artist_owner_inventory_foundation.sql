-- Additive ownership foundation. The application still reads legacy quantities
-- until the importer/app cutover; this migration does not claim full privacy.
-- Existing quantities are preserved, not silently corrected from a newer CSV.
do $$
declare legacy_owner uuid;
begin
  select id into strict legacy_owner from auth.users where lower(email) = 'kavigrace@gmail.com';
  if exists (select 1 from public.artist_signing_interests where owner_id <> legacy_owner) then
    raise exception 'Artist ownership backfill requires explicit review of additional owners';
  end if;
  if (select count(*) from public.artist_card_printings) <> 5451
    or (select sum(quantity) from public.artist_card_printings) <> 6181 then
    raise exception 'Artist snapshot changed since preflight; stop and re-audit';
  end if;
end $$;

alter table public.artist_import_batches add column owner_id uuid references auth.users(id) on delete cascade;
update public.artist_import_batches set owner_id = (select id from auth.users where lower(email) = 'kavigrace@gmail.com');
alter table public.artist_import_batches alter column owner_id set not null;
alter table public.artist_import_batches drop constraint artist_import_batches_source_path_source_sha256_key;
alter table public.artist_import_batches add constraint artist_import_batches_owner_source_key unique(owner_id, source_path, source_sha256);
alter table public.artist_import_batches add constraint artist_import_batches_owner_id_key unique(owner_id, id);
drop policy authenticated_read_artist_import_batches on public.artist_import_batches;
create policy owners_read_artist_import_batches on public.artist_import_batches for select to authenticated
  using ((select auth.uid()) = owner_id);

create table public.artist_collection_inventory (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  printing_id uuid not null references public.artist_card_printings(id) on delete cascade,
  quantity integer not null check(quantity >= 0),
  local_image_filename text,
  local_image_found boolean not null default false,
  source_batch_id uuid,
  source_record_ordinals integer[],
  source_observed_at timestamptz,
  imported_at timestamptz not null default now(),
  provenance_status text not null check(provenance_status in ('legacy_unlinked', 'source_linked')),
  unique(owner_id, printing_id),
  foreign key(owner_id, source_batch_id) references public.artist_import_batches(owner_id, id),
  check(source_record_ordinals is null or (cardinality(source_record_ordinals) > 0 and 0 < all(source_record_ordinals))),
  check(provenance_status <> 'source_linked' or (source_batch_id is not null and source_record_ordinals is not null))
);
create index artist_collection_inventory_printing_idx on public.artist_collection_inventory(printing_id);
create index artist_collection_inventory_batch_idx on public.artist_collection_inventory(owner_id, source_batch_id);
alter table public.artist_collection_inventory enable row level security;
alter table public.artist_collection_inventory force row level security;
revoke all on public.artist_collection_inventory from public, anon, authenticated;
grant select on public.artist_collection_inventory to authenticated;
grant all on public.artist_collection_inventory to service_role;
create policy owners_read_artist_collection_inventory on public.artist_collection_inventory for select to authenticated
  using ((select auth.uid()) = owner_id);

insert into public.artist_collection_inventory(owner_id, printing_id, quantity, local_image_filename, local_image_found, provenance_status)
select u.id, p.id, p.quantity, p.local_image_filename, p.local_image_found, 'legacy_unlinked'
from public.artist_card_printings p cross join auth.users u where lower(u.email) = 'kavigrace@gmail.com';

create table public.artist_collection_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  collection_card_count integer,
  unique_collection_printings integer,
  source_batch_id uuid,
  source_record_ordinals integer[],
  imported_at timestamptz not null default now(),
  unique(owner_id, artist_id),
  foreign key(owner_id, source_batch_id) references public.artist_import_batches(owner_id, id)
);
create index artist_collection_profiles_artist_idx on public.artist_collection_profiles(artist_id);
create index artist_collection_profiles_batch_idx on public.artist_collection_profiles(owner_id, source_batch_id);
alter table public.artist_collection_profiles enable row level security;
alter table public.artist_collection_profiles force row level security;
revoke all on public.artist_collection_profiles from public, anon, authenticated;
grant select on public.artist_collection_profiles to authenticated;
grant all on public.artist_collection_profiles to service_role;
create policy owners_read_artist_collection_profiles on public.artist_collection_profiles for select to authenticated
  using ((select auth.uid()) = owner_id);
insert into public.artist_collection_profiles(owner_id, artist_id, collection_card_count, unique_collection_printings)
select u.id, a.id, a.collection_card_count, a.unique_collection_printings
from public.artists a cross join auth.users u where lower(u.email) = 'kavigrace@gmail.com'
and (a.collection_card_count is not null or a.unique_collection_printings is not null);

alter table public.artist_card_assessments add column owner_id uuid references auth.users(id) on delete cascade;
update public.artist_card_assessments set owner_id = (select id from auth.users where lower(email) = 'kavigrace@gmail.com');
alter table public.artist_card_assessments alter column owner_id set not null;
alter table public.artist_card_assessments drop constraint artist_card_assessments_printing_id_key;
alter table public.artist_card_assessments add constraint artist_card_assessments_owner_printing_key unique(owner_id, printing_id);
alter table public.artist_card_assessments add column source_batch_id uuid;
alter table public.artist_card_assessments add column source_record_ordinals integer[];
alter table public.artist_card_assessments add column source_assessed_at timestamptz;
alter table public.artist_card_assessments add constraint artist_assessments_owner_batch_fk
  foreign key(owner_id, source_batch_id) references public.artist_import_batches(owner_id, id);
create index artist_card_assessments_owner_batch_idx on public.artist_card_assessments(owner_id, source_batch_id);
drop policy authenticated_read_artist_card_assessments on public.artist_card_assessments;
create policy owners_read_artist_card_assessments on public.artist_card_assessments for select to authenticated
  using ((select auth.uid()) = owner_id);

comment on table public.artist_collection_inventory is 'Private holdings keyed by owner and stable printing UUID. Additive migration preserves legacy totals until source reconciliation and app cutover.';
comment on column public.artist_collection_inventory.source_record_ordinals is 'One-based nonblank parsed CSV data-record ordinals, before eligibility filtering. Not physical line numbers. Null means not yet linked.';
comment on column public.artist_card_assessments.source_assessed_at is 'Source-reported assessment timestamp only. Null when unknown; legacy assessed_at was importer time and is not proof of source assessment date.';

do $$
begin
  if (select count(*) from public.artist_collection_inventory) <> 5451
    or (select sum(quantity) from public.artist_collection_inventory) <> 6181
    or (select md5(string_agg(id::text||':'||source_row_id,',' order by id)) from public.artist_card_printings) <> '5370157a7990b1d3aef3864534dd59b7'
    or (select md5(string_agg(row_to_json(s)::text,',' order by id)) from public.artist_signing_interests s) <> 'fe4403a01bc22bbeb798be51ede5530e' then
    raise exception 'Artist ownership preservation guard failed';
  end if;
end $$;
