import { describe, expect, it } from 'vitest'
import { inferTicketedPlayAvailability } from './ticketed_play_availability.mjs'

describe('ticketed play source availability', () => {
  it('uses explicit sold-out and waitlist evidence', () => {
    expect(inferTicketedPlayAvailability({ title: 'SOLD OUT - Mystery Sealed' })).toBe('sold_out')
    expect(inferTicketedPlayAvailability({ controls: [{ text: 'Join Waitlist' }] })).toBe('waitlist')
  })

  it('requires an active purchase control before calling a listing available', () => {
    expect(inferTicketedPlayAvailability({ title: 'Mystery Sealed - $100' })).toBe('unknown')
    expect(inferTicketedPlayAvailability({ controls: [{ text: 'Buy Tickets', disabled: false }] })).toBe('available')
    expect(inferTicketedPlayAvailability({ controls: [{ text: 'Register', disabled: true }] })).toBe('unavailable')
  })
})
