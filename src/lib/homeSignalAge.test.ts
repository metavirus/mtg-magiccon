import { describe, expect, it } from 'vitest'
import { homeSignalAgeBucket, homeSignalIsHotNow, isFeaturedTicketedPlaySale, isTicketedPlaySaleOpen, partitionHomeSignals, ticketedPlaySaleHasOpened, TICKETED_PLAY_SALE_OPENED_AT } from './homeSignalAge'

const now = new Date('2026-08-24T12:00:00Z').getTime()

describe('Home Worth Knowing age buckets', () => {
  it('switches the official sale milestone at 10 AM Pacific', () => {
    const openedAt = new Date(TICKETED_PLAY_SALE_OPENED_AT).getTime()
    expect(ticketedPlaySaleHasOpened(openedAt - 1)).toBe(false)
    expect(ticketedPlaySaleHasOpened(openedAt)).toBe(true)
  })

  it('labels the past three days Recent and days four through fourteen Earlier', () => {
    expect(homeSignalAgeBucket('2026-08-22T12:00:00Z', now)).toBe('recent')
    expect(homeSignalAgeBucket('2026-08-20T12:00:00Z', now)).toBe('earlier')
    expect(homeSignalAgeBucket('2026-08-10T12:00:00Z', now)).toBe('earlier')
  })

  it('keeps a hot signal in Hot now for one day before releasing it to Recent', () => {
    expect(homeSignalIsHotNow('2026-08-23T12:00:00Z', now)).toBe(true)
    expect(homeSignalIsHotNow('2026-08-23T11:59:59Z', now)).toBe(false)
  })

  it('partitions each signal exactly once as Hot now becomes Recent', () => {
    const signal = { severity: 'hot', checkedAtIso: '2026-08-23T12:00:00Z' }
    expect(partitionHomeSignals([signal], now)).toEqual({ hotNow: [signal], recent: [], earlier: [] })
    expect(partitionHomeSignals([signal], now + 1)).toEqual({ hotNow: [], recent: [signal], earlier: [] })
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
