import { describe, expect, it } from 'vitest'
import { planTicketedPlayAvailabilityEmail } from './ticketed_play_email_alert.mjs'

const watch = { sourceEventKey: '944127', title: 'Magic: The Menu - Brunch - with Numot the Nummy', registrationUrl: 'https://example.test/register', emailAlert: true }
const report = (availability: string, sourceEventKey = '944127') => ({
  checkedAt: '2026-08-26T20:00:00Z',
  changes: [{ intakeKind: 'ticketed_play_inventory', availabilityWatches: [watch], transitions: [{ sourceEventKey, availability, event: { sourceUrl: 'https://example.test' } }] }],
})
const closure = { catches: [{ sourceId: 'atlanta-ticketed-play-inventory', disposition: 'routed_signal', readbacks: [{ system: 'supabase' }] }] }

describe('watched Ticketed Play availability email', () => {
  it('plans an ALERT email for confirmed availability', () => {
    const alert = planTicketedPlayAvailabilityEmail(report('available'), closure)
    expect(alert?.subject).toBe('ALERT! Magic: The Menu - Brunch - with Numot the Nummy is available again')
    expect(alert?.text).toContain('Act quickly')
    expect(alert?.text).toContain(watch.registrationUrl)
  })

  it('accurately distinguishes a waitlist from a purchasable spot', () => {
    const alert = planTicketedPlayAvailabilityEmail(report('waitlist'), closure)
    expect(alert?.subject).toContain('accepting a waitlist')
    expect(alert?.text).not.toContain('purchase spot appears')
  })

  it('warns when SOLD OUT disappears before a price control can be confirmed', () => {
    const alert = planTicketedPlayAvailabilityEmail(report('potential_opening'), closure)
    expect(alert?.subject).toContain('possibly opening')
    expect(alert?.text).toContain('SOLD OUT label disappeared')
  })

  it('stays quiet for ambiguous, unrelated, or unverified changes', () => {
    expect(planTicketedPlayAvailabilityEmail(report('unknown'), closure)).toBeNull()
    expect(planTicketedPlayAvailabilityEmail(report('available', 'other'), closure)).toBeNull()
    expect(planTicketedPlayAvailabilityEmail(report('available'), { catches: [] })).toBeNull()
  })
})
