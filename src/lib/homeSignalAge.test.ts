import { describe, expect, it } from 'vitest'
import { homeSignalAgeBucket, isFeaturedTicketedPlaySale, isTicketedPlaySaleOpen } from './homeSignalAge'

const now = new Date('2026-08-24T12:00:00Z').getTime()

describe('Home Worth Knowing age buckets', () => {
  it('labels the past three days Recent and days four through fourteen Earlier', () => {
    expect(homeSignalAgeBucket('2026-08-22T12:00:00Z', now)).toBe('recent')
    expect(homeSignalAgeBucket('2026-08-20T12:00:00Z', now)).toBe('earlier')
    expect(homeSignalAgeBucket('2026-08-10T12:00:00Z', now)).toBe('earlier')
  })

  it('excludes older and invalid timestamps', () => {
    expect(homeSignalAgeBucket('2026-08-09T11:59:59Z', now)).toBeNull()
    expect(homeSignalAgeBucket('unknown', now)).toBeNull()
  })

  it('features an open ticketed-play sale for seven days, then releases it to the normal list', () => {
    const item = { conceptKey: 'atlanta:ticketed-play:sales-opening', monitoringConcept: { current_state: { phase: 'open', milestone_opened_at: '2026-08-24T12:00:00Z' } } }
    expect(isFeaturedTicketedPlaySale(item, now)).toBe(true)
    expect(isFeaturedTicketedPlaySale(item, now + 7 * 24 * 60 * 60 * 1000)).toBe(true)
    expect(isFeaturedTicketedPlaySale(item, now + 7 * 24 * 60 * 60 * 1000 + 1)).toBe(false)
    expect(isTicketedPlaySaleOpen(item)).toBe(true)
  })
})
