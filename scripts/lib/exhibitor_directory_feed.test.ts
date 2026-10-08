import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { exhibitorDirectoryFeedUrl, exhibitorDirectoryFingerprint, parseExhibitorDirectoryFeed } from './exhibitor_directory_feed.mjs'
import { pageContentFingerprint, watchedPageChanged } from './monitoring_page_fingerprint.mjs'
import { sourceOnboardingReview } from './monitoring_source_onboarding.mjs'
import { buildMonitoringCandidateRows } from './build_monitoring_candidates.mjs'

const source = JSON.parse(readFileSync('monitoring/watch-set.json', 'utf8')).sources.find((item: { id: string }) => item.id === 'atlanta-experience-exhibitors')
const config = source.exhibitorDirectoryFeed
const html = `<main>Exhibitors marketplace introduction and official links</main><script>$('#exhibListResults').growTixExhibitors({gtAPIKey:'${config.publicEventKey}',gtCategory:'${config.categoryId}'});</script>`
const row = (id: string, company: string) => ({ id, company, booth: '1001', description: '', global_categories: '', specials: '', exclusives: true })
const payload = { event_id: config.eventId, event_slug: config.eventSlug, space_orders: [row('1', 'Card Kingdom'), row('2', 'Dragon Shield')] }
const fingerprint = (data = payload) => exhibitorDirectoryFingerprint({ html, sourceUrl: source.url, config, page: pageContentFingerprint(html, source.url), fetchText: async () => ({ ok: true, status: 200, html: JSON.stringify(data) }) })

describe('official Atlanta exhibitor roster coverage', () => {
  it('detects roster, booth and profile-detail changes behind identical static HTML', async () => {
    const before = await fingerprint()
    for (const space_orders of [[...payload.space_orders, row('3', 'RockLove')], payload.space_orders.slice(1), payload.space_orders.map(item => ({ ...item, booth: '1002' })), payload.space_orders.map(item => ({ ...item, description: 'Community activities; no card sales.' })), payload.space_orders.map(item => ({ ...item, specials: 'Show offer' }))]) {
      expect(watchedPageChanged(before, await fingerprint({ ...payload, space_orders }))).toBe(true)
    }
    expect((await fingerprint({ ...payload, space_orders: [...payload.space_orders].reverse() })).contentHash).toBe(before.contentHash)
    expect(before.exhibitorDirectory.exhibitors[0].profileUrl).toContain('/exhibitor-showroom.html?gtID=1')
    expect(before.exhibitorDirectory.exhibitors[0].exclusives).toBe('')
  })
  it('rejects missing widget, wrong host/category/event, empty, malformed and duplicate feeds', async () => {
    expect(() => exhibitorDirectoryFeedUrl('', source.url, config)).toThrow()
    expect(() => exhibitorDirectoryFeedUrl(html.replace(config.categoryId, '20591'), source.url, config)).toThrow()
    expect(() => exhibitorDirectoryFeedUrl(html, source.url.replace('mcatlanta', 'mcamsterdam'), config)).toThrow()
    for (const invalid of [{ ...payload, event_id: 'wrong' }, { ...payload, event_slug: 'wrong' }, { ...payload, space_orders: [] }, { ...payload, space_orders: [row('1', '')] }, { ...payload, space_orders: [row('1', 'A'), row('1', 'B')] }]) expect(() => parseExhibitorDirectoryFeed(invalid, source.url, config)).toThrow()
    const options = { html, sourceUrl: source.url, config, page: pageContentFingerprint(html, source.url) }
    await expect(exhibitorDirectoryFingerprint({ ...options, fetchText: async () => ({ ok: false, status: 503, html: '' }) })).rejects.toThrow('HTTP 503')
    await expect(exhibitorDirectoryFingerprint({ ...options, fetchText: async () => ({ ok: true, status: 200, html: 'bad json' }) })).rejects.toThrow('not valid JSON')
  })
  it('publishes only exact reviewed feed content and keeps changed roster pending', async () => {
    const current = await fingerprint()
    const reviewedSource = { ...source, initialReview: { ...source.initialReview, contentHash: current.contentHash, contentLinkHash: current.contentLinkHash } }
    const change = { ...source, previous: { textSample: 'Previous static shell' }, current: { ...current, status: 200, textHash: current.contentHash, textSample: 'Static shell' }, reviewedEditorial: sourceOnboardingReview(reviewedSource, current), linkDelta: { added: [], removed: [] } }
    expect(buildMonitoringCandidateRows({ checkedAt: '2026-10-07T23:40:00Z', changes: [change] })[0].evidence.editorial.disposition).toBe('home')
    const changed = { ...change, reviewedEditorial: sourceOnboardingReview(reviewedSource, { ...current, contentHash: 'different' }) }
    expect(buildMonitoringCandidateRows({ checkedAt: '2026-10-07T23:40:00Z', changes: [changed] })[0].evidence.editorial.disposition).toBe('pending')
    const runtime = readFileSync('scripts/monitoring_watch_check.mjs', 'utf8')
    expect(runtime).toContain('source.exhibitorDirectoryFeed')
    expect(runtime).toContain('content.exhibitorDirectory?.rosterHash')
    expect(runtime).toContain('exhibitorDirectoryCoverage:')
  })
})
