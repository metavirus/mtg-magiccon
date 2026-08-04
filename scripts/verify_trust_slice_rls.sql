\set ON_ERROR_STOP on

\if :{?owner_id}
\else
  \echo 'owner_id psql variable is required'
  \quit
\endif

begin;
set local role authenticated;

select set_config('request.jwt.claim.sub', :'owner_id', true);

select
  (select count(*) = 1 from public.sources) as owner_reads_source,
  (select count(*) = 1 from public.source_observations) as owner_reads_observation,
  (select count(*) = 1 from public.occurrences) as owner_reads_occurrence,
  (select count(*) = 1 from public.personal_decisions) as owner_reads_decision,
  (select count(*) = 1 from public.itinerary_entries) as owner_reads_itinerary;

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', true);

select
  (select count(*) = 0 from public.sources) as other_owner_reads_no_sources,
  (select count(*) = 0 from public.source_observations) as other_owner_reads_no_observations,
  (select count(*) = 0 from public.occurrences) as other_owner_reads_no_occurrences,
  (select count(*) = 0 from public.personal_decisions) as other_owner_reads_no_decisions,
  (select count(*) = 0 from public.itinerary_entries) as other_owner_reads_no_itinerary;

with attempted as (
  update public.personal_decisions set note = note returning id
)
select count(*) = 0 as other_owner_updates_no_decisions from attempted;

with attempted as (
  delete from public.itinerary_entries returning id
)
select count(*) = 0 as other_owner_deletes_no_itinerary from attempted;

rollback;
