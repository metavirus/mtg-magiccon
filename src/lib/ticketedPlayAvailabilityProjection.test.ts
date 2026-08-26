import { describe, expect, it } from 'vitest'
import { applyTicketedPlayAvailabilityProjection, partitionExploreAvailability, ticketedPurchasePresentation } from './ticketedPlayAvailabilityProjection'

describe('current Ticketed Play availability projection', () => {
  it('lets the current exact-ID observation override static and older state, including restock', () => {
    const events = [{ id: 'ticketed-1', title: 'One', availability: 'sold-out' as const }]
    expect(applyTicketedPlayAvailabilityProjection(events, [{ event_id: 'ticketed-1', source_event_key: '1', availability: 'available', observed_at: '2026-08-26T00:00:00Z' }])[0].availability).toBe('open')
    expect(applyTicketedPlayAvailabilityProjection([{ ...events[0], availability: 'open' as const }], [{ event_id: 'ticketed-1', source_event_key: '1', availability: 'sold_out', observed_at: '2026-08-26T01:00:00Z' }])[0].availability).toBe('sold-out')
  })

  it('never falls back to a matching title', () => {
    const events = [{ id: 'ticketed-1', title: 'Same title', availability: 'open' as const }]
    const projected = applyTicketedPlayAvailabilityProjection(events, [{ event_id: 'ticketed-2', source_event_key: '2', availability: 'sold_out', observed_at: '2026-08-26T00:00:00Z' }])
    expect(projected).toEqual(events)
  })

  it('preserves the existing state when the current source observation is unknown', () => {
    const events = [{ id: 'ticketed-1', title: 'One', availability: 'open' as const }]
    expect(applyTicketedPlayAvailabilityProjection(events, [{ event_id: 'ticketed-1', source_event_key: '1', availability: 'unknown', observed_at: '2026-08-26T00:00:00Z' }])).toEqual(events)
  })

  it('partitions sold-out rows without duplicates', () => {
    const events = [{ id: 'one', availability: 'open' as const }, { id: 'two', availability: 'sold-out' as const }]
    const result = partitionExploreAvailability(events)
    expect(result.active.map(event => event.id)).toEqual(['one'])
    expect(result.soldOut.map(event => event.id)).toEqual(['two'])
    expect([...result.active, ...result.soldOut]).toHaveLength(events.length)
  })

  it('suppresses new purchase affordances but preserves existing purchases', () => {
    expect(ticketedPurchasePresentation({ availability: 'sold-out' })).toBe('sold_out')
    expect(ticketedPurchasePresentation({ availability: 'sold-out', purchased: true })).toBe('purchased')
  })
})
