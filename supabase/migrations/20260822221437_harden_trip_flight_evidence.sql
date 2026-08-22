create index trip_flight_source_evidence_itinerary_idx
  on public.trip_flight_source_evidence (itinerary_key);

create policy no_browser_access_to_trip_flight_source_evidence
  on public.trip_flight_source_evidence
  for select
  to authenticated
  using (false);

comment on policy no_browser_access_to_trip_flight_source_evidence on public.trip_flight_source_evidence is
  'Intentional deny policy: exact private Gmail source evidence is retained for the service executor and never exposed through the browser Data API.';
