begin;

create table public.sources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('official_page', 'private_artifact', 'vendor', 'venue', 'transport', 'lodging', 'community')),
  publisher_name text not null check (char_length(publisher_name) between 1 and 160),
  title text not null check (char_length(title) between 1 and 240),
  canonical_url text not null check (canonical_url ~ '^https://'),
  access_state text not null default 'available' check (access_state in ('available', 'inaccessible', 'stale', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_owner_required check (owner_id is not null),
  constraint sources_id_owner_unique unique (id, owner_id),
  constraint sources_owner_url_unique unique (owner_id, canonical_url)
);

comment on table public.sources is 'Owner-scoped identity for evidence sources; current normalized truth lives elsewhere.';

create table public.source_observations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source_id uuid not null,
  retrieved_at timestamptz not null,
  published_at timestamptz,
  effective_at timestamptz,
  event_date date,
  observation_status text not null check (observation_status in ('published', 'tentative', 'changed', 'canceled', 'contradicted', 'personally_confirmed', 'observed_onsite', 'superseded')),
  exact_wording text not null check (char_length(exact_wording) between 1 and 20000),
  supports text not null check (char_length(supports) between 1 and 1000),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  supersedes_observation_id uuid,
  created_at timestamptz not null default now(),
  constraint source_observations_owner_required check (owner_id is not null),
  constraint source_observations_id_owner_unique unique (id, owner_id),
  constraint source_observations_source_owner_fk foreign key (source_id, owner_id)
    references public.sources (id, owner_id) on delete cascade,
  constraint source_observations_owner_hash_unique unique (owner_id, source_id, content_hash)
);

alter table public.source_observations
  add constraint source_observations_supersedes_owner_fk
  foreign key (supersedes_observation_id, owner_id)
  references public.source_observations (id, owner_id) on delete restrict;

comment on table public.source_observations is 'Dated retained source wording and the bounded claim it supports; revisions create new observations.';

create table public.occurrences (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  current_observation_id uuid not null,
  title text not null check (char_length(title) between 1 and 240),
  occurrence_state text not null check (occurrence_state in ('published', 'tentative', 'changed', 'canceled', 'contradicted', 'personally_confirmed', 'observed_onsite', 'superseded')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  local_timezone text not null default 'America/New_York' check (char_length(local_timezone) between 1 and 80),
  time_certainty text not null default 'exact' check (time_certainty in ('exact', 'approximate', 'window', 'unknown')),
  time_semantics text not null default 'fixed' check (time_semantics in ('fixed', 'flexible', 'fuzzy')),
  location_label text check (location_label is null or char_length(location_label) between 1 and 240),
  location_state text not null default 'unknown' check (location_state in ('known', 'to_be_announced', 'unknown')),
  access_label text check (access_label is null or char_length(access_label) between 1 and 160),
  preparation_note text check (preparation_note is null or char_length(preparation_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint occurrences_owner_required check (owner_id is not null),
  constraint occurrences_time_order check (ends_at > starts_at),
  constraint occurrences_id_owner_unique unique (id, owner_id),
  constraint occurrences_observation_owner_fk foreign key (current_observation_id, owner_id)
    references public.source_observations (id, owner_id) on delete restrict
);

comment on table public.occurrences is 'Small normalized dated occurrence supported by a retained source observation.';

create table public.personal_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurrence_id uuid not null,
  planning_state text not null default 'none' check (planning_state in ('none', 'interested', 'tentative', 'committed', 'hidden', 'not_for_me')),
  purchased boolean not null default false,
  note text not null default '' check (char_length(note) <= 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_decisions_owner_required check (owner_id is not null),
  constraint personal_decisions_id_owner_unique unique (id, owner_id),
  constraint personal_decisions_occurrence_owner_fk foreign key (occurrence_id, owner_id)
    references public.occurrences (id, owner_id) on delete cascade,
  constraint personal_decisions_owner_occurrence_unique unique (owner_id, occurrence_id)
);

comment on table public.personal_decisions is 'Owner interpretation and reversible planning state; separate from publisher evidence.';

create table public.itinerary_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  decision_id uuid not null,
  occurrence_id uuid not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  time_semantics text not null default 'fixed' check (time_semantics in ('fixed', 'flexible', 'fuzzy')),
  timing_source text not null default 'occurrence' check (timing_source in ('occurrence', 'personal_override')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint itinerary_entries_owner_required check (owner_id is not null),
  constraint itinerary_entries_time_order check (ends_at > starts_at),
  constraint itinerary_entries_id_owner_unique unique (id, owner_id),
  constraint itinerary_entries_decision_owner_fk foreign key (decision_id, owner_id)
    references public.personal_decisions (id, owner_id) on delete cascade,
  constraint itinerary_entries_occurrence_owner_fk foreign key (occurrence_id, owner_id)
    references public.occurrences (id, owner_id) on delete cascade,
  constraint itinerary_entries_owner_decision_unique unique (owner_id, decision_id)
);

comment on table public.itinerary_entries is 'Minimal active Plan placement derived from an owner decision; not a general calendar model.';

create index sources_owner_id_idx on public.sources (owner_id);
create index source_observations_owner_source_retrieved_idx on public.source_observations (owner_id, source_id, retrieved_at desc);
create index source_observations_owner_supersedes_idx on public.source_observations (owner_id, supersedes_observation_id) where supersedes_observation_id is not null;
create index occurrences_owner_starts_idx on public.occurrences (owner_id, starts_at);
create index occurrences_owner_observation_idx on public.occurrences (owner_id, current_observation_id);
create index personal_decisions_owner_state_idx on public.personal_decisions (owner_id, planning_state);
create index itinerary_entries_owner_active_starts_idx on public.itinerary_entries (owner_id, active, starts_at);
create index itinerary_entries_owner_occurrence_idx on public.itinerary_entries (owner_id, occurrence_id);

alter table public.sources enable row level security;
alter table public.sources force row level security;
alter table public.source_observations enable row level security;
alter table public.source_observations force row level security;
alter table public.occurrences enable row level security;
alter table public.occurrences force row level security;
alter table public.personal_decisions enable row level security;
alter table public.personal_decisions force row level security;
alter table public.itinerary_entries enable row level security;
alter table public.itinerary_entries force row level security;

revoke all on table public.sources, public.source_observations, public.occurrences, public.personal_decisions, public.itinerary_entries from public, anon, authenticated;
grant select, insert, update, delete on table public.sources, public.source_observations, public.occurrences, public.personal_decisions, public.itinerary_entries to authenticated;

create policy "owners_select_sources" on public.sources for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners_insert_sources" on public.sources for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owners_update_sources" on public.sources for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners_delete_sources" on public.sources for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "owners_select_source_observations" on public.source_observations for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners_insert_source_observations" on public.source_observations for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owners_update_source_observations" on public.source_observations for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners_delete_source_observations" on public.source_observations for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "owners_select_occurrences" on public.occurrences for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners_insert_occurrences" on public.occurrences for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owners_update_occurrences" on public.occurrences for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners_delete_occurrences" on public.occurrences for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "owners_select_personal_decisions" on public.personal_decisions for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners_insert_personal_decisions" on public.personal_decisions for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owners_update_personal_decisions" on public.personal_decisions for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners_delete_personal_decisions" on public.personal_decisions for delete to authenticated using ((select auth.uid()) = owner_id);

create policy "owners_select_itinerary_entries" on public.itinerary_entries for select to authenticated using ((select auth.uid()) = owner_id);
create policy "owners_insert_itinerary_entries" on public.itinerary_entries for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy "owners_update_itinerary_entries" on public.itinerary_entries for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
create policy "owners_delete_itinerary_entries" on public.itinerary_entries for delete to authenticated using ((select auth.uid()) = owner_id);

commit;
