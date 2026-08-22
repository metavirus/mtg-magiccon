create table public.trip_flights (
  itinerary_key text primary key,
  carrier text not null,
  confirmation_code text not null,
  route_summary text not null,
  traveler_person_keys text[] not null,
  source_state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now()),
  constraint trip_flights_key_nonblank check (btrim(itinerary_key) <> ''),
  constraint trip_flights_confirmation_nonblank check (btrim(confirmation_code) <> ''),
  constraint trip_flights_travelers_nonempty check (cardinality(traveler_person_keys) > 0),
  constraint trip_flights_source_state_object check (jsonb_typeof(source_state) = 'object')
);

create table public.trip_flight_legs (
  itinerary_key text not null references public.trip_flights (itinerary_key) on delete cascade,
  leg_key text not null,
  sequence_number integer not null,
  flight_number text not null,
  departure_airport text not null,
  arrival_airport text not null,
  departure_at timestamptz not null,
  arrival_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (itinerary_key, leg_key),
  constraint trip_flight_legs_sequence_positive check (sequence_number > 0),
  constraint trip_flight_legs_airports_distinct check (departure_airport <> arrival_airport),
  constraint trip_flight_legs_time_order check (arrival_at > departure_at)
);

create table public.trip_flight_source_evidence (
  id uuid primary key default gen_random_uuid(),
  itinerary_key text not null references public.trip_flights (itinerary_key) on delete cascade,
  source_kind text not null,
  source_ref text not null,
  source_received_at timestamptz not null,
  source_subject text not null,
  confidence numeric(4,3) not null,
  match_evidence jsonb not null,
  prior_state jsonb not null,
  applied_state jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_kind, source_ref),
  constraint trip_flight_source_confidence_range check (confidence between 0 and 1),
  constraint trip_flight_source_match_object check (jsonb_typeof(match_evidence) = 'object'),
  constraint trip_flight_source_prior_object check (jsonb_typeof(prior_state) = 'object'),
  constraint trip_flight_source_applied_object check (jsonb_typeof(applied_state) = 'object')
);

comment on table public.trip_flights is 'Canonical shared trip-flight identity. Routine trusted schedule updates reconcile into this object.';
comment on table public.trip_flight_legs is 'Current canonical flight-leg schedule used by Trip and Calendar.';
comment on table public.trip_flight_source_evidence is 'Immutable private source lineage for applied flight changes; Gmail remains evidence, not the runtime trip surface.';

insert into public.trip_flights (itinerary_key, carrier, confirmation_code, route_summary, traveler_person_keys, source_state)
values ('atlanta-2026-delta-hogfbx', 'Delta Air Lines', 'HOGFBX', 'SNA to ATL and ATL to SNA', array['kavi','juan'], jsonb_build_object('source_kind','gmail','status','confirmed'));

insert into public.trip_flight_legs (itinerary_key, leg_key, sequence_number, flight_number, departure_airport, arrival_airport, departure_at, arrival_at)
values
  ('atlanta-2026-delta-hogfbx', 'outbound', 1, 'DL 1521', 'SNA', 'ATL', '2026-11-11 12:20:00-08', '2026-11-11 19:34:00-05'),
  ('atlanta-2026-delta-hogfbx', 'return', 2, 'DL 1602', 'ATL', 'SNA', '2026-11-15 20:35:00-05', '2026-11-15 22:29:00-08');

alter table public.trip_flights enable row level security;
alter table public.trip_flights force row level security;
alter table public.trip_flight_legs enable row level security;
alter table public.trip_flight_legs force row level security;
alter table public.trip_flight_source_evidence enable row level security;
alter table public.trip_flight_source_evidence force row level security;

revoke all on table public.trip_flights, public.trip_flight_legs, public.trip_flight_source_evidence from public, anon, authenticated;
grant select on table public.trip_flights, public.trip_flight_legs to authenticated;

create policy active_companions_select_trip_flights on public.trip_flights for select to authenticated
using (exists (select 1 from public.companion_members where user_id = (select auth.uid()) and active));
create policy active_companions_select_trip_flight_legs on public.trip_flight_legs for select to authenticated
using (exists (select 1 from public.companion_members where user_id = (select auth.uid()) and active));

create or replace function public.apply_confident_flight_schedule_update(
  p_itinerary_key text,
  p_source_kind text,
  p_source_ref text,
  p_source_received_at timestamptz,
  p_source_subject text,
  p_confidence numeric,
  p_match_evidence jsonb,
  p_update jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_flight public.trip_flights%rowtype;
  v_owner_id uuid;
  v_prior jsonb;
  v_applied jsonb;
  v_leg jsonb;
  v_changed boolean := false;
  v_rows integer;
begin
  if p_confidence < 0.90 then raise exception 'AMBIGUOUS_FLIGHT_UPDATE: confidence below 0.90'; end if;
  if jsonb_typeof(p_match_evidence) <> 'object' or jsonb_typeof(p_update) <> 'object' then raise exception 'INVALID_FLIGHT_UPDATE: evidence and update must be objects'; end if;

  select * into v_flight from public.trip_flights where itinerary_key = p_itinerary_key for update;
  if not found then raise exception 'AMBIGUOUS_FLIGHT_UPDATE: itinerary not found'; end if;
  if upper(coalesce(p_match_evidence->>'confirmation_code','')) <> upper(v_flight.confirmation_code)
     or lower(coalesce(p_match_evidence->>'carrier','')) not like '%delta%'
     or not coalesce((p_match_evidence->>'travelers_match')::boolean, false)
  then raise exception 'AMBIGUOUS_FLIGHT_UPDATE: confirmation, carrier, and travelers must all match'; end if;
  if jsonb_typeof(p_update->'legs') <> 'array' or jsonb_array_length(p_update->'legs') = 0 then raise exception 'INVALID_FLIGHT_UPDATE: complete changed legs are required'; end if;

  if exists (select 1 from public.trip_flight_source_evidence where source_kind = p_source_kind and source_ref = p_source_ref) then
    return jsonb_build_object('status','already_applied','itinerary_key',p_itinerary_key);
  end if;

  select jsonb_build_object('itinerary_key', f.itinerary_key, 'carrier', f.carrier, 'confirmation_code', f.confirmation_code,
    'legs', coalesce(jsonb_agg(jsonb_build_object('leg_key',l.leg_key,'sequence_number',l.sequence_number,'flight_number',l.flight_number,
      'departure_airport',l.departure_airport,'arrival_airport',l.arrival_airport,'departure_at',l.departure_at,'arrival_at',l.arrival_at) order by l.sequence_number),'[]'::jsonb))
  into v_prior from public.trip_flights f left join public.trip_flight_legs l on l.itinerary_key=f.itinerary_key where f.itinerary_key=p_itinerary_key group by f.itinerary_key;

  for v_leg in select value from jsonb_array_elements(p_update->'legs') loop
    if nullif(v_leg->>'leg_key','') is null or nullif(v_leg->>'flight_number','') is null
       or nullif(v_leg->>'departure_airport','') is null or nullif(v_leg->>'arrival_airport','') is null
       or nullif(v_leg->>'departure_at','') is null or nullif(v_leg->>'arrival_at','') is null
    then raise exception 'INVALID_FLIGHT_UPDATE: every changed leg needs identity, route, flight number, and times'; end if;
    update public.trip_flight_legs set
      flight_number = v_leg->>'flight_number', departure_airport = upper(v_leg->>'departure_airport'), arrival_airport = upper(v_leg->>'arrival_airport'),
      departure_at = (v_leg->>'departure_at')::timestamptz, arrival_at = (v_leg->>'arrival_at')::timestamptz, updated_at = timezone('utc', now())
    where itinerary_key=p_itinerary_key and leg_key=v_leg->>'leg_key'
      and (flight_number,departure_airport,arrival_airport,departure_at,arrival_at) is distinct from
          (v_leg->>'flight_number',upper(v_leg->>'departure_airport'),upper(v_leg->>'arrival_airport'),(v_leg->>'departure_at')::timestamptz,(v_leg->>'arrival_at')::timestamptz);
    get diagnostics v_rows = row_count;
    if v_rows = 0 and not exists (select 1 from public.trip_flight_legs where itinerary_key=p_itinerary_key and leg_key=v_leg->>'leg_key') then
      raise exception 'AMBIGUOUS_FLIGHT_UPDATE: unknown leg %', v_leg->>'leg_key';
    end if;
    v_changed := v_changed or v_rows > 0;
  end loop;

  update public.trip_flights set source_state=jsonb_build_object('source_kind',p_source_kind,'source_ref',p_source_ref,'source_received_at',p_source_received_at,'subject',p_source_subject), updated_at=timezone('utc',now()) where itinerary_key=p_itinerary_key;
  select jsonb_build_object('itinerary_key', f.itinerary_key, 'carrier', f.carrier, 'confirmation_code', f.confirmation_code,
    'legs', jsonb_agg(jsonb_build_object('leg_key',l.leg_key,'sequence_number',l.sequence_number,'flight_number',l.flight_number,
      'departure_airport',l.departure_airport,'arrival_airport',l.arrival_airport,'departure_at',l.departure_at,'arrival_at',l.arrival_at) order by l.sequence_number))
  into v_applied from public.trip_flights f join public.trip_flight_legs l on l.itinerary_key=f.itinerary_key where f.itinerary_key=p_itinerary_key group by f.itinerary_key;

  insert into public.trip_flight_source_evidence (itinerary_key,source_kind,source_ref,source_received_at,source_subject,confidence,match_evidence,prior_state,applied_state)
  values (p_itinerary_key,p_source_kind,p_source_ref,p_source_received_at,p_source_subject,p_confidence,p_match_evidence,v_prior,v_applied);

  if v_changed then
    select user_id into v_owner_id from public.companion_members where person_key='kavi' and active;
    if v_owner_id is null then raise exception 'CANONICAL_OWNER_NOT_LINKED'; end if;
    insert into public.user_activity_events (owner_id,actor_label,object_id,object_kind,activity_type,summary,details)
    values (v_owner_id,'Surveyor',p_itinerary_key,'trip','flight_schedule_changed','Your Atlanta flight changed.',
      jsonb_build_object('destination','Trip','prior_state',v_prior,'current_state',v_applied,'source_kind',p_source_kind,'source_ref',p_source_ref,'home_worthy',true));
    insert into public.monitoring_concepts (owner_id,concept_key,concept_kind,title,current_summary,current_state,latest_resolution,attention_state,evidence_count,first_seen_at,last_seen_at,review_state)
    values (v_owner_id,'atlanta:trip:flight:'||lower(v_flight.confirmation_code),'flight_schedule','Atlanta flight changed','Your Atlanta flight changed.',
      jsonb_build_object('itinerary_key',p_itinerary_key,'destination','Trip','source_label','Delta schedule-change email','source_ref',p_source_ref),
      'material_update','material_update',1,p_source_received_at,p_source_received_at,'unread')
    on conflict (owner_id,concept_key) do update set current_summary=excluded.current_summary,current_state=excluded.current_state,latest_resolution='material_update',attention_state='material_update',last_seen_at=excluded.last_seen_at,review_state='unread',updated_at=timezone('utc',now());
  end if;
  return jsonb_build_object('status',case when v_changed then 'applied' else 'corroborated' end,'itinerary_key',p_itinerary_key,'changed',v_changed,'current_state',v_applied);
end;
$$;

revoke all on function public.apply_confident_flight_schedule_update(text,text,text,timestamptz,text,numeric,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.apply_confident_flight_schedule_update(text,text,text,timestamptz,text,numeric,jsonb,jsonb) to service_role;
