create extension if not exists pgcrypto with schema extensions;

create table if not exists public.artist_import_batches (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_path text not null,
  source_sha256 text not null,
  source_kind text not null check (source_kind in ('artist_profiles', 'card_catalog', 'reconciliation', 'manual_seed')),
  imported_at timestamptz not null default now(),
  notes text,
  unique (source_path, source_sha256)
);

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null unique,
  display_name text not null,
  profile_image_url text,
  scryfall_search_url text,
  predominant_style text,
  abstract_surreal_tendency text,
  style_confidence text,
  style_description text,
  collection_card_count integer,
  unique_collection_printings integer,
  mtg_catalog_printings_found integer,
  earliest_mtg_credit_year integer,
  latest_mtg_credit_year integer,
  historical_style_signals text,
  sample_mtg_cards text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.artist_appearances (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  event_key text not null default 'magiccon_atlanta_2026',
  attending_status text not null default 'unknown' check (attending_status in ('confirmed', 'unconfirmed', 'unknown', 'not_attending')),
  appearance_days text,
  official_profile_url text,
  source_note text,
  priority_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, event_key)
);

create table if not exists public.artist_cards (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  scryfall_id text,
  card_name text not null,
  scryfall_url text,
  card_image_url text,
  art_crop_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scryfall_id)
);

create table if not exists public.artist_card_printings (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.artist_cards(id) on delete cascade,
  source_row_id text not null unique,
  set_code text,
  set_name text,
  collector_number text,
  foil text,
  rarity text,
  quantity integer not null default 1,
  market_price_usd numeric(10, 2),
  market_price_source_field text,
  scryfall_usd numeric(10, 2),
  scryfall_usd_foil numeric(10, 2),
  scryfall_usd_etched numeric(10, 2),
  scryfall_eur numeric(10, 2),
  scryfall_eur_foil numeric(10, 2),
  scryfall_mtgo_tix numeric(10, 2),
  price_as_of text,
  price_notes text,
  printing_type text,
  special_treatments text[] not null default '{}',
  local_image_filename text,
  local_image_found boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id, set_code, collector_number, foil)
);

create table if not exists public.artist_card_assessments (
  id uuid primary key default gen_random_uuid(),
  printing_id uuid not null references public.artist_card_printings(id) on delete cascade,
  card_art_category text,
  surreal_abstract_focus text,
  card_art_confidence text,
  card_art_description text,
  visual_art_category text,
  visual_match_for_taste text,
  visual_confidence text,
  visual_assessment_notes text,
  metadata_vs_visual text,
  card_art_basis text,
  card_art_tags text[] not null default '{}',
  review_rank integer,
  assessment_source text not null default 'chatgpt_v2_artist_card_taxonomy',
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (printing_id)
);

create table if not exists public.artist_signing_interests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  card_id uuid references public.artist_cards(id) on delete cascade,
  printing_id uuid references public.artist_card_printings(id) on delete cascade,
  interest_status text not null default 'not_reviewed' check (interest_status in ('not_reviewed', 'maybe', 'want_signed', 'skip')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint artist_signing_interest_card_consistency check (
    printing_id is not null or card_id is not null or artist_id is not null
  )
);

create unique index if not exists artist_signing_interests_owner_artist_only_idx
  on public.artist_signing_interests(owner_id, artist_id)
  where card_id is null and printing_id is null;

create unique index if not exists artist_signing_interests_owner_card_idx
  on public.artist_signing_interests(owner_id, card_id)
  where card_id is not null and printing_id is null;

create unique index if not exists artist_signing_interests_owner_printing_idx
  on public.artist_signing_interests(owner_id, printing_id)
  where printing_id is not null;

create index if not exists artist_appearances_event_status_idx
  on public.artist_appearances(event_key, attending_status);

create index if not exists artist_cards_artist_idx on public.artist_cards(artist_id);
create index if not exists artist_card_printings_card_idx on public.artist_card_printings(card_id);
create index if not exists artist_card_assessments_printing_idx on public.artist_card_assessments(printing_id);

alter table public.artist_import_batches enable row level security;
alter table public.artists enable row level security;
alter table public.artist_appearances enable row level security;
alter table public.artist_cards enable row level security;
alter table public.artist_card_printings enable row level security;
alter table public.artist_card_assessments enable row level security;
alter table public.artist_signing_interests enable row level security;

alter table public.artist_import_batches force row level security;
alter table public.artists force row level security;
alter table public.artist_appearances force row level security;
alter table public.artist_cards force row level security;
alter table public.artist_card_printings force row level security;
alter table public.artist_card_assessments force row level security;
alter table public.artist_signing_interests force row level security;

revoke all on public.artist_import_batches from public, anon, authenticated;
revoke all on public.artists from public, anon, authenticated;
revoke all on public.artist_appearances from public, anon, authenticated;
revoke all on public.artist_cards from public, anon, authenticated;
revoke all on public.artist_card_printings from public, anon, authenticated;
revoke all on public.artist_card_assessments from public, anon, authenticated;
revoke all on public.artist_signing_interests from public, anon, authenticated;

grant select on public.artist_import_batches to authenticated;
grant select on public.artists to authenticated;
grant select on public.artist_appearances to authenticated;
grant select on public.artist_cards to authenticated;
grant select on public.artist_card_printings to authenticated;
grant select on public.artist_card_assessments to authenticated;
grant select, insert, update, delete on public.artist_signing_interests to authenticated;

drop policy if exists authenticated_read_artist_import_batches on public.artist_import_batches;
create policy authenticated_read_artist_import_batches
  on public.artist_import_batches
  for select
  to authenticated
  using (true);

drop policy if exists authenticated_read_artists on public.artists;
create policy authenticated_read_artists
  on public.artists
  for select
  to authenticated
  using (true);

drop policy if exists authenticated_read_artist_appearances on public.artist_appearances;
create policy authenticated_read_artist_appearances
  on public.artist_appearances
  for select
  to authenticated
  using (true);

drop policy if exists authenticated_read_artist_cards on public.artist_cards;
create policy authenticated_read_artist_cards
  on public.artist_cards
  for select
  to authenticated
  using (true);

drop policy if exists authenticated_read_artist_card_printings on public.artist_card_printings;
create policy authenticated_read_artist_card_printings
  on public.artist_card_printings
  for select
  to authenticated
  using (true);

drop policy if exists authenticated_read_artist_card_assessments on public.artist_card_assessments;
create policy authenticated_read_artist_card_assessments
  on public.artist_card_assessments
  for select
  to authenticated
  using (true);

drop policy if exists owners_read_artist_signing_interests on public.artist_signing_interests;
create policy owners_read_artist_signing_interests
  on public.artist_signing_interests
  for select
  to authenticated
  using ((select auth.uid()) = owner_id);

drop policy if exists owners_insert_artist_signing_interests on public.artist_signing_interests;
create policy owners_insert_artist_signing_interests
  on public.artist_signing_interests
  for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

drop policy if exists owners_update_artist_signing_interests on public.artist_signing_interests;
create policy owners_update_artist_signing_interests
  on public.artist_signing_interests
  for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

drop policy if exists owners_delete_artist_signing_interests on public.artist_signing_interests;
create policy owners_delete_artist_signing_interests
  on public.artist_signing_interests
  for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

comment on table public.artists is 'Canonical artist entities. CSV files are source evidence only after this table is hydrated.';
comment on table public.artist_card_printings is 'Canonical owned/card-candidate printing facts, including price and physical variant fields.';
comment on table public.artist_card_assessments is 'Interpretive card-art/taste assessment facts separated from card identity and pricing.';
