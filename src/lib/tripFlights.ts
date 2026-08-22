import type { SupabaseClient } from '@supabase/supabase-js'

export type TripFlightLeg = {
  itinerary_key: string
  leg_key: string
  sequence_number: number
  flight_number: string
  departure_airport: string
  arrival_airport: string
  departure_at: string
  arrival_at: string
  updated_at: string
}

export type TripFlight = {
  itinerary_key: string
  carrier: string
  confirmation_code: string
  route_summary: string
  traveler_person_keys: string[]
  source_state: Record<string, unknown>
  updated_at: string
  legs: TripFlightLeg[]
}

export const previewTripFlights: TripFlight[] = [{
  itinerary_key: 'atlanta-2026-delta-hogfbx',
  carrier: 'Delta Air Lines',
  confirmation_code: 'HOGFBX',
  route_summary: 'SNA to ATL and ATL to SNA',
  traveler_person_keys: ['kavi', 'juan'],
  source_state: { source_kind: 'gmail', status: 'confirmed' },
  updated_at: '2026-08-22T00:00:00Z',
  legs: [
    { itinerary_key: 'atlanta-2026-delta-hogfbx', leg_key: 'outbound', sequence_number: 1, flight_number: 'DL 1521', departure_airport: 'SNA', arrival_airport: 'ATL', departure_at: '2026-11-11T12:20:00-08:00', arrival_at: '2026-11-11T19:34:00-05:00', updated_at: '2026-08-22T00:00:00Z' },
    { itinerary_key: 'atlanta-2026-delta-hogfbx', leg_key: 'return', sequence_number: 2, flight_number: 'DL 1602', departure_airport: 'ATL', arrival_airport: 'SNA', departure_at: '2026-11-15T20:35:00-05:00', arrival_at: '2026-11-15T22:29:00-08:00', updated_at: '2026-08-22T00:00:00Z' },
  ],
}]

export type FlightUpdateMatch = {
  confirmationCode?: string
  carrier?: string
  travelersMatch?: boolean
  confidence: number
  changedLegsComplete: boolean
  cancellationOrRebooking: boolean
}

export function flightScheduleChangeIsAutoApplicable(match: FlightUpdateMatch) {
  return match.confidence >= 0.9
    && match.confirmationCode?.trim().toUpperCase() === 'HOGFBX'
    && match.carrier?.toLowerCase().includes('delta') === true
    && match.travelersMatch === true
    && match.changedLegsComplete
    && !match.cancellationOrRebooking
}

export async function loadTripFlights(client: SupabaseClient): Promise<TripFlight[]> {
  const [flightResult, legResult] = await Promise.all([
    client.from('trip_flights').select('itinerary_key,carrier,confirmation_code,route_summary,traveler_person_keys,source_state,updated_at').order('itinerary_key'),
    client.from('trip_flight_legs').select('itinerary_key,leg_key,sequence_number,flight_number,departure_airport,arrival_airport,departure_at,arrival_at,updated_at').order('sequence_number'),
  ])
  if (flightResult.error) throw flightResult.error
  if (legResult.error) throw legResult.error
  const legs = legResult.data as TripFlightLeg[]
  return (flightResult.data as Omit<TripFlight, 'legs'>[]).map(flight => ({
    ...flight,
    legs: legs.filter(leg => leg.itinerary_key === flight.itinerary_key),
  }))
}
