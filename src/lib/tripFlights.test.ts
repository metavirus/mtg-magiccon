import { describe, expect, it } from 'vitest'
import { flightScheduleChangeIsAutoApplicable } from './tripFlights'

const matched = {
  confirmationCode: 'HOGFBX', carrier: 'Delta Air Lines', travelersMatch: true,
  confidence: 0.98, changedLegsComplete: true, cancellationOrRebooking: false,
}

describe('flight schedule auto-apply boundary', () => {
  it('auto-applies a complete, confidently matched routine schedule change', () => {
    expect(flightScheduleChangeIsAutoApplicable(matched)).toBe(true)
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
