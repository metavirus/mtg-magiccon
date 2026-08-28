import { describe, expect, it } from 'vitest'
import { ticketedPlayAvailabilityProjectionRows } from './ticketed_play_availability_projection.mjs'

describe('shared Ticketed Play availability projection privacy', () => {
  it('retains only exact identity, availability, and observation time', () => {
    const [row] = ticketedPlayAvailabilityProjectionRows([{
      id: 'ticketed-944015', sourceEventKey: '944015', availability: 'sold_out', retrievedAt: '2026-08-25T20:00:00Z',
      title: 'Private-unneeded title', people: ['Kavi'], availabilityEvidence: { text: 'SOLD OUT' },
    }])
    expect(row).toEqual({ event_id: 'ticketed-944015', source_event_key: '944015', availability: 'sold_out', observed_at: '2026-08-25T20:00:00Z' })
  })

  it('rejects noncanonical hash identities instead of title matching', () => {
    expect(ticketedPlayAvailabilityProjectionRows([{ id: 'leap-deadbeef', sourceEventKey: 'leap-deadbeef', availability: 'sold_out', retrievedAt: '2026-08-25T20:00:00Z', title: 'Same title' }])).toEqual([])
  })

  it('does not overwrite canonical availability with an unknown observation', () => {
    expect(ticketedPlayAvailabilityProjectionRows([{
      id: 'ticketed-944027', sourceEventKey: '944027', availability: 'unknown', retrievedAt: '2026-08-28T01:30:09.731Z',
    }])).toEqual([])
  })
})
