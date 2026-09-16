import { describe, expect, it } from 'vitest'
import { planTicketedPlayAvailabilityWrites, verifyTicketedPlayAvailabilityWrites } from './ticketed_play_availability_write_plan.mjs'

const row = (id: string, availability: string, observedAt = '2026-09-16T01:00:00Z') => ({ event_id: `ticketed-${id}`, source_event_key: id, availability, observed_at: observedAt })

describe('bounded canonical availability writes', () => {
  it('writes nothing for an unchanged check even though the survey observed it again', () => {
    expect(planTicketedPlayAvailabilityWrites([row('1', 'sold_out')], [row('1', 'sold_out', '2026-09-15T01:00:00Z')])).toEqual([])
  })

  it('recovers missing rows and writes a changed canonical state', () => {
    expect(planTicketedPlayAvailabilityWrites([row('1', 'sold_out'), row('2', 'available')], [row('1', 'available')])).toEqual([row('1', 'sold_out'), row('2', 'available')])
    expect(planTicketedPlayAvailabilityWrites([row('1', 'sold_out')], [{ ...row('1', 'sold_out'), source_event_key: '9' }])).toEqual([row('1', 'sold_out')])
  })

  it('requires exact returned facts for every write', () => {
    expect(verifyTicketedPlayAvailabilityWrites([row('1', 'sold_out')], [row('1', 'sold_out')])).toHaveLength(1)
    expect(verifyTicketedPlayAvailabilityWrites([row('1', 'sold_out', '2026-09-16T01:00:00Z')], [row('1', 'sold_out', '2026-09-16T01:00:00+00:00')])).toHaveLength(1)
    expect(() => verifyTicketedPlayAvailabilityWrites([row('1', 'sold_out')], [])).toThrow(/write\/readback mismatch/)
    expect(() => verifyTicketedPlayAvailabilityWrites([row('1', 'sold_out')], [row('1', 'available')])).toThrow(/write\/readback mismatch/)
  })
})
