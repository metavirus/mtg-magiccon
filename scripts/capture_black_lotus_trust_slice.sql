\set ON_ERROR_STOP on

\if :{?owner_id}
\else
  \echo 'owner_id psql variable is required'
  \quit
\endif

begin;

insert into public.sources (
  owner_id,
  source_type,
  publisher_name,
  title,
  canonical_url,
  access_state
)
values (
  :'owner_id'::uuid,
  'official_page',
  'ReedPop / MagicCon: Atlanta',
  'MagicCon: Atlanta Black Lotus VIP',
  'https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges/black-lotus-vip-experience.html',
  'available'
)
on conflict (owner_id, canonical_url) do update
set publisher_name = excluded.publisher_name,
    title = excluded.title,
    access_state = excluded.access_state,
    updated_at = now();

select id as source_id
from public.sources
where owner_id = :'owner_id'::uuid
  and canonical_url = 'https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges/black-lotus-vip-experience.html'
\gset

insert into public.source_observations (
  owner_id,
  source_id,
  retrieved_at,
  event_date,
  observation_status,
  exact_wording,
  supports,
  content_hash
)
values (
  :'owner_id'::uuid,
  :'source_id'::uuid,
  '2026-08-03T10:34:06-07:00'::timestamptz,
  '2026-11-14'::date,
  'published',
  '11:30 AM – 3:00 PM - WotC Casual Play Designers and members of the Commander Format Panel (CFP) present Planechase Unknown*. Commander Deck needed.',
  'Supports a Black Lotus-access Saturday Planechase Unknown occurrence from 11:30 AM to 3:00 PM and the need to bring a Commander deck; location remains unannounced and the page says the schedule is subject to change.',
  'e27ed7780f599716493b2e15b0731a9b9bd6719f8f1cb1bcfbc557a104f2ad4e'
)
on conflict (owner_id, source_id, content_hash) do nothing;

select id as observation_id
from public.source_observations
where owner_id = :'owner_id'::uuid
  and source_id = :'source_id'::uuid
  and content_hash = 'e27ed7780f599716493b2e15b0731a9b9bd6719f8f1cb1bcfbc557a104f2ad4e'
\gset

insert into public.occurrences (
  owner_id,
  current_observation_id,
  title,
  occurrence_state,
  starts_at,
  ends_at,
  local_timezone,
  time_certainty,
  time_semantics,
  location_state,
  access_label,
  preparation_note
)
select
  :'owner_id'::uuid,
  :'observation_id'::uuid,
  'Black Lotus Planechase Unknown',
  'published',
  '2026-11-14 11:30:00-05'::timestamptz,
  '2026-11-14 15:00:00-05'::timestamptz,
  'America/New_York',
  'exact',
  'fixed',
  'to_be_announced',
  'Black Lotus VIP',
  'Bring a Commander deck.'
where not exists (
  select 1 from public.occurrences
  where owner_id = :'owner_id'::uuid
    and title = 'Black Lotus Planechase Unknown'
    and starts_at = '2026-11-14 11:30:00-05'::timestamptz
);

select id as occurrence_id
from public.occurrences
where owner_id = :'owner_id'::uuid
  and title = 'Black Lotus Planechase Unknown'
  and starts_at = '2026-11-14 11:30:00-05'::timestamptz
order by created_at
limit 1
\gset

insert into public.personal_decisions (
  owner_id,
  occurrence_id,
  planning_state,
  purchased
)
values (
  :'owner_id'::uuid,
  :'occurrence_id'::uuid,
  'interested',
  false
)
on conflict (owner_id, occurrence_id) do nothing;

select id as decision_id
from public.personal_decisions
where owner_id = :'owner_id'::uuid
  and occurrence_id = :'occurrence_id'::uuid
\gset

insert into public.itinerary_entries (
  owner_id,
  decision_id,
  occurrence_id,
  starts_at,
  ends_at,
  time_semantics,
  timing_source,
  active
)
values (
  :'owner_id'::uuid,
  :'decision_id'::uuid,
  :'occurrence_id'::uuid,
  '2026-11-14 11:30:00-05'::timestamptz,
  '2026-11-14 15:00:00-05'::timestamptz,
  'fixed',
  'occurrence',
  true
)
on conflict (owner_id, decision_id) do nothing;

commit;

select
  s.publisher_name,
  o.retrieved_at,
  o.observation_status,
  x.title,
  x.starts_at,
  x.ends_at,
  x.location_state,
  d.planning_state,
  i.active as itinerary_active
from public.sources s
join public.source_observations o on o.source_id = s.id and o.owner_id = s.owner_id
join public.occurrences x on x.current_observation_id = o.id and x.owner_id = o.owner_id
join public.personal_decisions d on d.occurrence_id = x.id and d.owner_id = x.owner_id
join public.itinerary_entries i on i.decision_id = d.id and i.owner_id = d.owner_id
where s.owner_id = :'owner_id'::uuid
  and o.content_hash = 'e27ed7780f599716493b2e15b0731a9b9bd6719f8f1cb1bcfbc557a104f2ad4e';
