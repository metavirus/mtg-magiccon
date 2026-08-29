import { describe, expect, it } from 'vitest'
import { acceptClosedPublicWatchChanges, acceptClosedTicketedPlayChanges, stageTicketedPlayBaselineSnapshot } from './monitoring_baseline_acceptance.mjs'

const checkedAt = '2026-08-28T17:24:54.702Z'
const report = { checkedAt, mode: 'check' }
const manifest = {
  catches: [
    { sourceId: 'atlanta-faq', intakeKind: 'public_watch' },
    { sourceId: 'atlanta-ticketed-play-inventory', intakeKind: 'ticketed_play_inventory' },
  ],
}

describe('closed monitoring baseline acceptance', () => {
  it('promotes only exact closed public-watch snapshots without refetching', () => {
    const result = acceptClosedPublicWatchChanges(report, manifest, {
      checkedAt,
      accepted: { 'atlanta-faq': { textHash: 'old' } },
      pending: {
        'atlanta-faq': { textHash: 'reviewed', linkHash: 'links', links: [{ label: 'FAQ', url: 'https://example.com' }], detectedAt: checkedAt },
        leftover: { textHash: 'unrelated', detectedAt: '2026-08-27T00:00:00Z' },
      },
    })
    expect(result.acceptedSourceIds).toEqual(['atlanta-faq'])
    expect(result.state.accepted['atlanta-faq']).toEqual({
      textHash: 'reviewed', linkHash: 'links', links: [{ label: 'FAQ', url: 'https://example.com' }], acceptedAt: checkedAt,
    })
    expect(result.state.pending['atlanta-faq']).toBeUndefined()
    expect(result.state.pending.leftover).toBeDefined()
  })

  it('fails closed when state or pending evidence does not match the verified report', () => {
    expect(() => acceptClosedPublicWatchChanges(report, manifest, { checkedAt: 'other', accepted: {}, pending: {} })).toThrow(/state checkedAt/i)
    expect(() => acceptClosedPublicWatchChanges(report, manifest, { checkedAt, accepted: {}, pending: {} })).toThrow(/exact pending snapshot missing.*atlanta-faq/i)
    expect(() => acceptClosedPublicWatchChanges(report, manifest, {
      checkedAt, accepted: {}, pending: { 'atlanta-faq': { detectedAt: 'other' } },
    })).toThrow(/exact pending snapshot missing.*atlanta-faq/i)
  })
})

describe('closed Ticketed Play baseline acceptance', () => {
  const inventory = [{ id: 'ticketed-1', availability: 'sold_out' }]

  it('stages a changed inventory without advancing the accepted baseline', () => {
    const accepted = [{ id: 'ticketed-1', availability: 'unknown' }]
    const state = stageTicketedPlayBaselineSnapshot({ accepted, acceptedAt: 'earlier' }, inventory, checkedAt, true)
    expect(state.accepted).toEqual(accepted)
    expect(state.acceptedAt).toBe('earlier')
    expect(state.pending).toEqual({ events: inventory, detectedAt: checkedAt })
  })

  it('promotes only the exact timestamp-matched inventory after closure', () => {
    const result = acceptClosedTicketedPlayChanges(
      { ...report, ticketedPlay: { inventory } },
      manifest,
      { version: 2, accepted: [], pending: { events: inventory, detectedAt: checkedAt } },
    )
    expect(result.accepted).toBe(true)
    expect(result.state.accepted).toEqual(inventory)
    expect(result.state.acceptedAt).toBe(checkedAt)
    expect(result.state.pending).toBeUndefined()
  })

  it('fails closed when the pending inventory or timestamp differs', () => {
    expect(() => acceptClosedTicketedPlayChanges(
      { ...report, ticketedPlay: { inventory } }, manifest,
      { pending: { events: inventory, detectedAt: 'other' } },
    )).toThrow(/exact pending snapshot missing/i)
    expect(() => acceptClosedTicketedPlayChanges(
      { ...report, ticketedPlay: { inventory } }, manifest,
      { pending: { events: [{ id: 'other' }], detectedAt: checkedAt } },
    )).toThrow(/does not match/i)
  })
})
