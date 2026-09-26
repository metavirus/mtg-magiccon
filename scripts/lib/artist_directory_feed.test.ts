import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { artistDirectoryFeedUrl, artistDirectoryFingerprint, parseArtistDirectoryFeed } from './artist_directory_feed.mjs'
import { pageContentFingerprint, watchedPageChanged } from './monitoring_page_fingerprint.mjs'
import { relevantDetailCoverageGaps } from './monitoring_detail_coverage.mjs'
import { sourceOnboardingReview } from './monitoring_source_onboarding.mjs'
import { buildMonitoringCandidateRows } from './build_monitoring_candidates.mjs'
import { acceptClosedPublicWatchChanges } from './monitoring_baseline_acceptance.mjs'

const source = JSON.parse(readFileSync('monitoring/watch-set.json', 'utf8')).sources.find((item: { id: string }) => item.id === 'atlanta-artist-directory')
const config = source.artistDirectoryFeed
const html = `<main>Artist Directory Artist Directory Back to Experience</main><script>$('#exhibListResults').growTixExhibitors({ gtAPIKey: '${config.publicEventKey}', gtCategory: '${config.categoryId}' });</script>`
const row = (id: string, name: string) => ({ id, company: name, booth: '9001', global_categories: [{ id: config.categoryId, name: 'Art of Magic' }] })
const payload = { event_id: config.eventId, event_slug: config.eventSlug, space_orders: [row('668804', 'Cynthia Shepard'), row('668806', 'Mark Poole')] }
const fingerprint = (data = payload, markup = html) => artistDirectoryFingerprint({ html: markup, sourceUrl: source.url, config, page: pageContentFingerprint(markup, source.url), fetchText: async () => ({ ok: true, status: 200, html: JSON.stringify(data) }) })

describe('official Atlanta dynamic artist roster coverage', () => {
  it('detects changed roster and booth despite identical static page HTML', async () => {
    const before = await fingerprint()
    const added = await fingerprint({ ...payload, space_orders: [...payload.space_orders, row('668809', 'Serena Malyon')] })
    const removed = await fingerprint({ ...payload, space_orders: payload.space_orders.slice(0, 1) })
    const booth = await fingerprint({ ...payload, space_orders: payload.space_orders.map(item => ({ ...item, booth: '9002' })) })
    for (const current of [added, removed, booth]) expect(watchedPageChanged(before, current)).toBe(true)
    expect(before.artistDirectory.count).toBe(2)
    expect(before.contentSample).toContain('Cynthia Shepard | Booth 9001')
    expect(before.artistDirectory.artists[0].profileUrl).toContain('artist-showroom.html?gtID=668804')
    expect((await fingerprint({ ...payload, space_orders: [...payload.space_orders].reverse() })).contentHash).toBe(before.contentHash)
  })

  it.each([
    { ...payload, space_orders: [] },
    { ...payload, space_orders: undefined },
    { ...payload, event_id: 'wrong-event' },
    { ...payload, event_slug: 'wrong-edition' },
    { ...payload, space_orders: [row('1', '')] },
    { ...payload, space_orders: [row('1', 'Artist'), row('1', 'Duplicate')] },
    { ...payload, space_orders: [{ ...row('1', 'Artist'), global_categories: [{ id: 'wrong-category' }] }] },
  ])('rejects empty, unparsed, or misidentified feeds as incomplete coverage', invalid => {
    expect(() => parseArtistDirectoryFeed(invalid, source.url, config)).toThrow()
  })

  it('fails the source when feed transport or widget identity fails', async () => {
    const options = { html, sourceUrl: source.url, config, page: pageContentFingerprint(html, source.url) }
    await expect(artistDirectoryFingerprint({ ...options, fetchText: async () => ({ ok: false, status: 503, html: '' }) })).rejects.toThrow('HTTP 503')
    await expect(artistDirectoryFingerprint({ ...options, fetchText: async () => ({ ok: true, status: 200, html: '<html>not a feed</html>' }) })).rejects.toThrow('not valid JSON')
    expect(() => artistDirectoryFeedUrl('<main>Artist Directory</main>', source.url, config)).toThrow('widget identity')
    expect(() => artistDirectoryFeedUrl(html.replace(config.publicEventKey, 'other-event'), source.url, config)).toThrow('widget identity')
    expect(() => artistDirectoryFeedUrl(html, 'https://mcamsterdam.mtgfestivals.com/en-us/art-of-magic/artist-directory.html', config)).toThrow('identity mismatch')
  })

  it('retains feed evidence and uses existing reviewed Home and exact-report closure', async () => {
    const current = await fingerprint()
    const reviewedSource = { ...source, initialReview: { ...source.initialReview, contentHash: current.contentHash, contentLinkHash: current.contentLinkHash } }
    const checkedAt = '2026-09-25T19:00:00Z'
    const report = { checkedAt, changes: [{ ...source, initialSourceReview: true, previous: null, current: { ...current, status: 200, textHash: current.contentHash, textSample: current.contentSample }, reviewedEditorial: sourceOnboardingReview(reviewedSource, current), linkDelta: { added: [], removed: [] } }] }
    const [candidate] = buildMonitoringCandidateRows(report)
    expect(candidate.evidence.editorial.disposition).toBe('home')
    expect(candidate.evidence.current.artistDirectory.artists).toHaveLength(2)
    expect(sourceOnboardingReview(reviewedSource, { ...current, contentHash: 'new-roster' })).toBeNull()
    const manifest = { catches: [{ sourceId: source.id, intakeKind: 'public_watch' }] }
    const state = { checkedAt, accepted: {}, pending: { [source.id]: { ...report.changes[0].current, detectedAt: checkedAt } } }
    expect(acceptClosedPublicWatchChanges(report, manifest, state).acceptedSourceIds).toEqual([source.id])
    expect(() => acceptClosedPublicWatchChanges(report, manifest, { ...state, pending: {} })).toThrow(/exact pending/)
  })

  it('recognizes art-of-magic links and retains the unimplemented Gathering Grounds schedule gap', () => {
    const schedule = 'https://mcatlanta.mtgfestivals.com/en-us/experience/the-gathering-grounds/the-gathering-grounds-schedule.html'
    const links = [{ url: source.url, label: 'Artist Directory' }, { url: schedule, label: 'Schedule' }]
    expect(relevantDetailCoverageGaps(links, [], 'home').map(item => item.url)).toContain(source.url)
    expect(relevantDetailCoverageGaps(links, [source.url], 'home').map(item => item.url)).toEqual([schedule])
  })

  it('keeps a roster change distinct when other pages share the same navigation delta', async () => {
    const current = await fingerprint()
    const common = { previous: { textSample: 'previous text' }, current: { textHash: current.contentHash, textSample: current.contentSample }, linkDelta: { added: ['New page -> https://mcatlanta.mtgfestivals.com/en-us/info/new.html'], removed: [] } }
    const ordinary = { ...common, id: 'atlanta-info', label: 'Info', url: 'https://mcatlanta.mtgfestivals.com/en-us/info.html' }
    const artists = { ...source, ...common, current: { ...common.current, ...current } }
    for (const changes of [[ordinary, artists], [artists, ordinary]]) {
      const rows = buildMonitoringCandidateRows({ checkedAt: '2026-09-26T02:30:00Z', changes })
      expect(rows).toHaveLength(2)
      expect(rows.find(item => item.source_id === source.id)?.evidence.current.artistDirectory.count).toBe(2)
    }
  })
})
