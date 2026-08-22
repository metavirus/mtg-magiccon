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
  v_replacement boolean;
  v_cancellation_or_rebooking boolean;
begin
  if jsonb_typeof(p_match_evidence) <> 'object' then
    raise exception 'INVALID_FLIGHT_UPDATE: match evidence must be an object';
  end if;
  if jsonb_typeof(p_match_evidence -> 'changed_legs_complete') <> 'boolean'
     or (p_match_evidence ->> 'changed_legs_complete')::boolean is distinct from true
  then
    raise exception 'INVALID_FLIGHT_UPDATE: changed_legs_complete must be explicitly true';
  end if;
  if jsonb_typeof(p_match_evidence -> 'cancellation_or_rebooking') <> 'boolean' then
    raise exception 'AMBIGUOUS_FLIGHT_UPDATE: cancellation_or_rebooking must be an explicit boolean';
  end if;
  if jsonb_typeof(p_match_evidence -> 'airline_assigned_replacement') <> 'boolean' then
    raise exception 'AMBIGUOUS_FLIGHT_UPDATE: airline_assigned_replacement must be an explicit boolean';
  end if;

  v_cancellation_or_rebooking := (p_match_evidence ->> 'cancellation_or_rebooking')::boolean;
  v_replacement := (p_match_evidence ->> 'airline_assigned_replacement')::boolean;

  if v_cancellation_or_rebooking and not v_replacement then
    raise exception 'AMBIGUOUS_FLIGHT_UPDATE: cancellation or choice-required rebooking cannot auto-apply';
  end if;
  if v_replacement then
    if jsonb_typeof(p_match_evidence -> 'user_action_required') <> 'boolean'
       or (p_match_evidence ->> 'user_action_required')::boolean is distinct from false
       or jsonb_typeof(p_match_evidence -> 'unresolved_choice') <> 'boolean'
       or (p_match_evidence ->> 'unresolved_choice')::boolean is distinct from false
       or jsonb_typeof(p_match_evidence -> 'same_itinerary') <> 'boolean'
       or (p_match_evidence ->> 'same_itinerary')::boolean is distinct from true
       or jsonb_typeof(p_match_evidence -> 'same_travelers') <> 'boolean'
       or (p_match_evidence ->> 'same_travelers')::boolean is distinct from true
       or jsonb_typeof(p_match_evidence -> 'same_carrier') <> 'boolean'
       or (p_match_evidence ->> 'same_carrier')::boolean is distinct from true
       or jsonb_typeof(p_match_evidence -> 'same_dates') <> 'boolean'
       or (p_match_evidence ->> 'same_dates')::boolean is distinct from true
       or jsonb_typeof(p_match_evidence -> 'same_routes') <> 'boolean'
       or (p_match_evidence ->> 'same_routes')::boolean is distinct from true
    then
      raise exception 'AMBIGUOUS_FLIGHT_UPDATE: replacement requires explicit no-action/no-choice and same itinerary, travelers, carrier, dates, and routes';
    end if;
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
  'Service-only guarded flight updater. Ordinary schedule changes require explicit completeness and non-rebooking evidence. Airline-assigned replacements additionally require explicit no-action/no-choice and stable itinerary, traveler, carrier, date, and route proof.';
