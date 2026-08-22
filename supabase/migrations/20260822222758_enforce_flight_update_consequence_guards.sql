alter function public.apply_confident_flight_schedule_update(text,text,text,timestamptz,text,numeric,jsonb,jsonb)
  rename to apply_confident_flight_schedule_update_internal;

revoke all on function public.apply_confident_flight_schedule_update_internal(text,text,text,timestamptz,text,numeric,jsonb,jsonb)
  from public, anon, authenticated, service_role;

create function public.apply_confident_flight_schedule_update(
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
begin
  if jsonb_typeof(p_match_evidence) <> 'object' then
    raise exception 'INVALID_FLIGHT_UPDATE: match evidence must be an object';
  end if;
  if jsonb_typeof(p_match_evidence -> 'cancellation_or_rebooking') <> 'boolean'
     or (p_match_evidence ->> 'cancellation_or_rebooking')::boolean is distinct from false
  then
    raise exception 'AMBIGUOUS_FLIGHT_UPDATE: cancellation_or_rebooking must be explicitly false';
  end if;
  if jsonb_typeof(p_match_evidence -> 'changed_legs_complete') <> 'boolean'
     or (p_match_evidence ->> 'changed_legs_complete')::boolean is distinct from true
  then
    raise exception 'INVALID_FLIGHT_UPDATE: changed_legs_complete must be explicitly true';
  end if;

  return public.apply_confident_flight_schedule_update_internal(
    p_itinerary_key,
    p_source_kind,
    p_source_ref,
    p_source_received_at,
    p_source_subject,
    p_confidence,
    p_match_evidence,
    p_update
  );
end;
$$;

revoke all on function public.apply_confident_flight_schedule_update(text,text,text,timestamptz,text,numeric,jsonb,jsonb)
  from public, anon, authenticated;
grant execute on function public.apply_confident_flight_schedule_update(text,text,text,timestamptz,text,numeric,jsonb,jsonb)
  to service_role;

comment on function public.apply_confident_flight_schedule_update(text,text,text,timestamptz,text,numeric,jsonb,jsonb) is
  'Service-only guarded flight updater. Cancellation/rebooking must be explicitly false and changed-leg completeness explicitly true before the internal atomic executor can run.';
