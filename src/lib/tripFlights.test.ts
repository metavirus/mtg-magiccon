import { describe, expect, it } from 'vitest'
import { flightScheduleChangeIsAutoApplicable, previewTripFlights, tripFlightCalendarProjection } from './tripFlights'

const matched = {
  confirmationCode: 'HOGFBX', carrier: 'Delta Air Lines', travelersMatch: true,
  confidence: 0.98, changedLegsComplete: true, cancellationOrRebooking: false,
}

describe('flight schedule auto-apply boundary', () => {
  it('auto-applies a complete, confidently matched routine schedule change', () => {
    expect(flightScheduleChangeIsAutoApplicable(matched)).toBe(true)
  })

  it('allows a complete airline-assigned replacement with no choice or action', () => {
    expect(flightScheduleChangeIsAutoApplicable({
      ...matched,
      cancellationOrRebooking: true,
      airlineAssignedReplacement: true,
      userActionRequired: false,
      unresolvedChoice: false,
      stableReplacementMapping: true,
    })).toBe(true)
  })

  it.each([
    { userActionRequired: true },
    { unresolvedChoice: true },
    { stableReplacementMapping: false },
    { airlineAssignedReplacement: false },
  ])('rejects an unresolved or unstable replacement: %o', override => {
    expect(flightScheduleChangeIsAutoApplicable({
      ...matched,
      cancellationOrRebooking: true,
      airlineAssignedReplacement: true,
      userActionRequired: false,
      unresolvedChoice: false,
      stableReplacementMapping: true,
      ...override,
    })).toBe(false)
  })

  it.each([
    { confidence: 0.89 },
    { confirmationCode: 'OTHER' },
    { carrier: 'Unknown sender' },
    { travelersMatch: false },
    { changedLegsComplete: false },
    { cancellationOrRebooking: true },
  ])('requires one precise exception decision for %o', override => {
    expect(flightScheduleChangeIsAutoApplicable({ ...matched, ...override })).toBe(false)
  })
})

describe('calendar flight projection', () => {
  it('projects the current canonical itinerary instead of the original receipt schedule', () => {
    const projection = tripFlightCalendarProjection(previewTripFlights)
    expect(projection.outbound.flight_number).toBe('DL 329')
    expect(projection.outbound.arrival_at).toBe('2026-11-11T21:16:00-05:00')
    expect(projection.returnLeg.departure_at).toBe('2026-11-15T20:25:00-05:00')
  })

  it('follows a changed canonical leg without requiring Calendar copy changes', () => {
    const changed = structuredClone(previewTripFlights)
    changed[0].legs[0].flight_number = 'DL 999'
    expect(tripFlightCalendarProjection(changed).outbound.flight_number).toBe('DL 999')
  })
})
