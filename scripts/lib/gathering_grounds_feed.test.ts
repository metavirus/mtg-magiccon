import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fetchGatheringGroundsFeedText, gatheringGroundsFeedUrl, gatheringGroundsFingerprint, parseGatheringGroundsFeed } from './gathering_grounds_feed.mjs'
import { pageContentFingerprint, watchedPageChanged } from './monitoring_page_fingerprint.mjs'
import { sourceOnboardingReview } from './monitoring_source_onboarding.mjs'
import { buildMonitoringCandidateRows } from './build_monitoring_candidates.mjs'
import { acceptClosedPublicWatchChanges } from './monitoring_baseline_acceptance.mjs'
import { relevantDetailCoverageGaps } from './monitoring_detail_coverage.mjs'

const watchSet = JSON.parse(readFileSync('monitoring/watch-set.json', 'utf8'))
const source = watchSet.sources.find((item: { id: string }) => item.id === 'atlanta-gathering-grounds-schedule')
const config = source.gatheringGroundsFeed
const html = `<main>The Gathering Grounds The Gathering Grounds Schedule</main><script>$('#schedule').growTixScheduleSlim({ gtAPIKey: '${config.publicEventKey}', gtCategory: '${config.categoryId}' });</script>`
const row = (id = '954454', title = 'BOP! Free Headshots Booth') => ({ id, title, start_time: '2026-11-13 10:30:00', end_time: '2026-11-13 12:30:00', location: 'The Gathering Grounds', description: 'Free headshots for marginalized creators.', global_categories: [{ id: config.categoryId, name: 'Gathering Grounds' }] })
const payload = { event_id: config.eventId, event_slug: config.eventSlug, schedules: [row(), row('954466', 'DAA Commander Sleeve Decorating')] }
const fingerprint = (data = payload) => gatheringGroundsFingerprint({ html, sourceUrl: source.url, config, page: pageContentFingerprint(html, source.url), fetchText: async () => ({ ok: true, status: 200, html: JSON.stringify(data) }) })

describe('official Gathering Grounds dynamic schedule coverage', () => {
  it('binds every expanded schedule to its exact category and detail page', async () => {
    for (const id of ['atlanta-family-magic-schedule', 'atlanta-experience-meet-and-greets', 'atlanta-experience-panels-and-events']) {
      const item = watchSet.sources.find((candidate: { id: string }) => candidate.id === id)
      const expandedConfig = item.gatheringGroundsFeed
      const markup = html.replace(config.categoryId, expandedConfig.categoryId)
      const data = { ...payload, schedules: [{ ...row(), global_categories: [{ id: expandedConfig.categoryId }] }] }
      const result = await gatheringGroundsFingerprint({ html: markup, sourceUrl: item.url, config: expandedConfig, page: pageContentFingerprint(markup, item.url), fetchText: async () => ({ ok: true, status: 200, html: JSON.stringify(data) }) })
      expect(result.gatheringGrounds.status).toBe('complete')
      expect(result.gatheringGrounds.sessions[0].detailUrl).toContain(id.includes('panels') ? '/panels-and-events/panel-information.html?' : '/schedule-event-information.html?')
      expect(() => parseGatheringGroundsFeed(payload, item.url, expandedConfig)).toThrow('wrong-category')
      expect(() => gatheringGroundsFeedUrl(markup, source.url, expandedConfig)).toThrow('page identity')
      expect(() => parseGatheringGroundsFeed({ ...data, event_id: 'other' }, item.url, expandedConfig)).toThrow('event identity')
    }
  })

  it('retains an identity-proven empty Family feed as awaiting publication and detects first sessions', async () => {
    const item = watchSet.sources.find((candidate: { id: string }) => candidate.id === 'atlanta-family-magic-schedule')
    const expandedConfig = item.gatheringGroundsFeed
    const markup = html.replace(config.categoryId, expandedConfig.categoryId)
    const data = { ...payload, schedules: [] }
    const options = { html: markup, sourceUrl: item.url, config: expandedConfig, page: pageContentFingerprint(markup, item.url) }
    const before = await gatheringGroundsFingerprint({ ...options, fetchText: async () => ({ ok: true, status: 200, html: JSON.stringify(data) }) })
    expect(before.gatheringGrounds).toMatchObject({ status: 'awaiting_publication', count: 0 })
    expect(before.contentSample).toContain('No published sessions')
    expect(() => parseGatheringGroundsFeed({ ...data, schedules: undefined }, item.url, expandedConfig)).toThrow('unparsed')
    const after = await gatheringGroundsFingerprint({ ...options, fetchText: async () => ({ ok: true, status: 200, html: JSON.stringify({ ...data, schedules: [{ ...row(), global_categories: [{ id: expandedConfig.categoryId }] }] }) }) })
    expect(watchedPageChanged(before, after)).toBe(true)
    expect(item.initialReview.disposition).toBe('noise')
  })
  it('detects real schedule changes under unchanged HTML and ignores feed ordering', async () => {
    const before = await fingerprint()
    const versions = [
      { ...payload, schedules: [...payload.schedules, row('954999', 'New session')] },
      { ...payload, schedules: payload.schedules.slice(0, 1) },
      ...[
        { title: 'Changed title' }, { start_time: '2026-11-13 11:00:00' }, { end_time: '2026-11-13 13:00:00' },
        { location: 'New location' }, { description: 'Sign up at the booth' }, { people: [{ id: '10', name: 'Host' }] }, { cancelled: true },
      ].map(change => ({ ...payload, schedules: [{ ...row(), ...change }, payload.schedules[1]] })),
    ]
    for (const version of versions) expect(watchedPageChanged(before, await fingerprint(version))).toBe(true)
    expect((await fingerprint({ ...payload, schedules: [...payload.schedules].reverse() })).contentHash).toBe(before.contentHash)
    expect(before.gatheringGrounds.sessions[0].detailUrl).toContain('schedule-event-information.html?gtID=954454')
  })

  it.each([
    { ...payload, schedules: [] }, { ...payload, schedules: undefined },
    { ...payload, event_id: 'other' }, { ...payload, event_slug: 'other' },
    { ...payload, schedules: [row('bad-id')] }, { ...payload, schedules: [row('1', '')] },
    { ...payload, schedules: [row(), row()] },
    { ...payload, schedules: [{ ...row(), global_categories: [{ id: 'other' }] }] },
    { ...payload, schedules: [{ ...row(), start_time: '' }] },
    { ...payload, schedules: [{ ...row(), end_time: '2026-11-13 09:00:00' }] },
  ])('fails closed for empty, malformed, misidentified, or invalid-time feeds', invalid => {
    expect(() => parseGatheringGroundsFeed(invalid, source.url, config)).toThrow()
  })

  it('preserves ambiguous publisher times and descriptions without repairing facts', () => {
    const [session] = parseGatheringGroundsFeed({ ...payload, schedules: [{ ...row(), end_time: row().start_time, description: 'Description says a different time: noon.' }] }, source.url, config)
    expect(session.startTime).toBe(session.endTime)
    expect(session.description).toContain('noon')
  })

  it('rejects missing/changed widgets and failed/malformed transport', async () => {
    for (const markup of ['', html.replace(config.publicEventKey, 'other'), html.replace(config.categoryId, 'other')]) expect(() => gatheringGroundsFeedUrl(markup, source.url, config)).toThrow('widget identity')
    expect(() => gatheringGroundsFeedUrl(html, source.url.replace('mcatlanta', 'mcamsterdam'), config)).toThrow('page identity')
    const options = { html, sourceUrl: source.url, config, page: pageContentFingerprint(html, source.url) }
    await expect(gatheringGroundsFingerprint({ ...options, fetchText: async () => ({ ok: false, status: 503, html: '' }) })).rejects.toThrow('HTTP 503')
    await expect(gatheringGroundsFingerprint({ ...options, fetchText: async () => ({ ok: true, status: 200, html: '<html>' }) })).rejects.toThrow('not valid JSON')
  })

  it('bounds transport size and passes an abort signal with redirects disabled', async () => {
    const calls: RequestInit[] = []
    const fetchImpl = async (_url: string, options: RequestInit) => { calls.push(options); return new Response('12345') }
    await expect(fetchGatheringGroundsFeedText('https://example.test', { fetchImpl, maxBytes: 4 })).rejects.toThrow('byte limit')
    expect(calls[0].redirect).toBe('error')
    expect(calls[0].signal).toBeInstanceOf(AbortSignal)
    await expect(fetchGatheringGroundsFeedText('https://example.test', { fetchImpl, maxBytes: 5 })).resolves.toMatchObject({ html: '12345', ok: true })
  })

  it('retains evidence and uses exact reviewed Home disposition and baseline closure', async () => {
    const current = await fingerprint()
    const reviewedSource = { ...source, initialReview: { ...source.initialReview, contentHash: current.contentHash, contentLinkHash: current.contentLinkHash } }
    const checkedAt = '2026-09-28T16:00:00Z'
    const report = { checkedAt, changes: [{ ...source, initialSourceReview: true, previous: null, current: { ...current, status: 200, textHash: current.contentHash }, reviewedEditorial: sourceOnboardingReview(reviewedSource, current), linkDelta: { added: [], removed: [] } }] }
    const [candidate] = buildMonitoringCandidateRows(report)
    expect(candidate.evidence.editorial.disposition).toBe('home')
    expect(candidate.title).toBe('Gathering Grounds schedule is available')
    expect(candidate.evidence.current.gatheringGrounds.sessions).toHaveLength(2)
    expect(sourceOnboardingReview(reviewedSource, { ...current, contentHash: 'changed-session' })).toBeNull()
    expect(sourceOnboardingReview(reviewedSource, { ...current, contentLinkHash: 'changed-link' })).toBeNull()
    const manifest = { catches: [{ sourceId: source.id, intakeKind: 'public_watch' }] }
    const state = { checkedAt, accepted: {}, pending: { [source.id]: { ...report.changes[0].current, detectedAt: checkedAt } } }
    expect(acceptClosedPublicWatchChanges(report, manifest, state).acceptedSourceIds).toEqual([source.id])
    expect(() => acceptClosedPublicWatchChanges(report, manifest, { ...state, pending: {} })).toThrow(/exact pending/)
  })

  it('applies exact feed reviews to existing baselines and holds later changed bytes', async () => {
    const current = await fingerprint()
    const reviewedSource = { ...source, initialReview: { ...source.initialReview, contentHash: current.contentHash, contentLinkHash: current.contentLinkHash } }
    const make = (version = current) => ({ checkedAt: '2026-10-01T22:00:00Z', changes: [{ ...source, initialSourceReview: false, previous: { contentHash: 'old-shell', textSample: 'old shell' }, current: { ...version, status: 200, textHash: version.contentHash }, reviewedEditorial: sourceOnboardingReview(reviewedSource, version), linkDelta: { added: [], removed: [] } }] })
    expect(buildMonitoringCandidateRows(make())[0].evidence.editorial.disposition).toBe('home')
    expect(buildMonitoringCandidateRows(make({ ...current, contentHash: 'changed-session' }))[0].evidence.editorial.disposition).toBe('pending')
    const runtime = readFileSync('scripts/monitoring_watch_check.mjs', 'utf8')
    expect(runtime).toContain('reviewedEditorial: sourceOnboardingReview(source, current)')
    expect(runtime).not.toContain('...(!previous ? { reviewedEditorial:')
  })

  it('does not merge schedule evidence with shared navigation changes', async () => {
    const current = await fingerprint()
    const common = { previous: { textSample: 'before' }, current: { textHash: current.contentHash }, linkDelta: { added: ['New page -> https://mcatlanta.mtgfestivals.com/en-us/info/new.html'], removed: [] } }
    const ordinary = { ...common, id: 'atlanta-info', label: 'Info', url: 'https://mcatlanta.mtgfestivals.com/en-us/info.html' }
    const schedule = { ...source, ...common, current: { ...common.current, ...current } }
    for (const changes of [[ordinary, schedule], [schedule, ordinary]]) {
      const candidates = buildMonitoringCandidateRows({ checkedAt: '2026-09-28T16:00:00Z', changes })
      expect(candidates).toHaveLength(2)
      const candidate = candidates.find(item => item.source_id === source.id)
      expect(candidate.evidence.editorial.disposition).toBe('pending')
      expect(candidate.status).toBe('needs_review')
    }
  })

  it('covers the exact schedule and freshly reviewed legacy ADA path until its deadline', () => {
    const ada = 'https://mcatlanta.mtgfestivals.com/en-us/info/ada-assistance.html'
    const links = [{ url: source.url, label: 'Schedule' }, { url: ada, label: 'ADA' }]
    const watched = watchSet.sources.map((item: { url: string }) => item.url)
    const exclusion = watchSet.detailCoverageExclusions.find(item => item.url === ada)
    expect(exclusion).toBeDefined()
    if (!exclusion) throw new Error('Exact legacy ADA exclusion is required')
    expect(Date.parse(exclusion.reviewAfter)).toBeGreaterThan(Date.parse(exclusion.reviewedAt))
    expect(relevantDetailCoverageGaps(links, watched, 'faq', watchSet.detailCoverageExclusions, exclusion.reviewedAt)).toEqual([])
    expect(relevantDetailCoverageGaps(links, watched, 'faq', watchSet.detailCoverageExclusions, exclusion.reviewAfter).map(item => item.url)).toEqual([ada])
  })
})
