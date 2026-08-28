import { describe, expect, it } from 'vitest'
import { acceptClosedPublicWatchChanges } from './monitoring_baseline_acceptance.mjs'

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
