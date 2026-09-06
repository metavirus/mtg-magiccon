import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error Executable monitoring helper is an ESM script without declarations.
import { canonicalNewsletterUrl, discoverNewsletterLinks, discoverNewsletterCoverage, fetchNewsletterPages, planNewsletterFetch } from '../../scripts/lib/first_party_newsletter_intake.mjs'
import { extractMonitoringConcepts, reconcileMonitoringObservation } from '../../scripts/lib/monitoring_concept_reconciler.mjs'
import { buildMonitoringCandidateRows } from '../../scripts/lib/build_monitoring_candidates.mjs'
import { monitoringConceptBaselineFromInfo, projectRegisteredFactResolution, verifyRegisteredFactReadback } from '../../scripts/lib/monitoring_info_projection.mjs'

const fixture = (name: string) => readFile(path.join(process.cwd(), 'scripts', 'fixtures', 'newsletter-intake', name), 'utf8')
const policy = {
  allowedHost: 'www.mtgfestivals.com',
  discoverySourceIds: ['global-magiccon-news'],
  pathPrefixes: ['/global/en-us/magiccon-news/'],
  linkPattern: /newsletter|magiccon[ -]news|news|article/i,
}
const limits = { maxLinks: 12, maxPages: 4, maxBytes: 512, timeoutMs: 50, maxTextChars: 8_000 }

describe('bounded first-party newsletter intake', () => {
  it('discovers, canonicalizes, dedupes, fetches and feeds registered claims', async () => {
    const html = await fixture('discovery.html')
    const article = await fixture('operations-update.html')
    const links = discoverNewsletterLinks([{ id: 'global-magiccon-news', url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news.html', html }], policy, limits)
    expect(links).toEqual([{ url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/atlanta-operations-update.html', label: 'MagicCon News: Atlanta operations', discoveredFrom: 'global-magiccon-news' }])
    const fetchImpl = async () => new Response(article, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
    const first = await fetchNewsletterPages({ links, policy, limits, fetchImpl, observedAt: '2026-08-24T20:00:00Z' })
    const concepts = extractMonitoringConcepts({ sourceId: first.observations[0].id, sourceUrl: first.observations[0].url, observedAt: '2026-08-24T20:00:00Z', text: first.observations[0].semanticSummary })
    expect(concepts.map(item => item.concept_key)).toEqual(expect.arrayContaining([
      'atlanta:on-demand-play:voucher-price', 'atlanta:prize-tix:sunday-line-cutoff', 'atlanta:hours:show-floor:sunday',
    ]))
    expect(concepts.find(item => item.concept_key === 'atlanta:hours:show-floor:sunday')?.claim.value).toBe('10 AM–7 PM')
    const [rawEvidence] = buildMonitoringCandidateRows({ checkedAt: '2026-08-24T20:00:00Z', changes: first.observations })
    expect(rawEvidence).toMatchObject({ status: 'unread', evidence: { intake_kind: 'first_party_newsletter' } })
    const repeat = await fetchNewsletterPages({ links, policy, limits, fetchImpl, seen: first.seen, observedAt: '2026-08-24T21:00:00Z' })
    expect(repeat.observations).toEqual([])
    const baseline = await fetchNewsletterPages({ links, policy, limits, fetchImpl, observedAt: '2026-08-24T19:00:00Z', suppressObservations: true })
    expect(baseline.observations).toEqual([])
    expect(Object.keys(baseline.seen)).toEqual([links[0].url])
  })

  it('projects registered claims into maintained Info while retaining the article for editorial review', async () => {
    const article = await fixture('operations-update.html')
    const link = { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/atlanta-operations-update.html', label: 'Atlanta operations', discoveredFrom: 'global-magiccon-news' }
    const fetched = await fetchNewsletterPages({ links: [link], policy, limits, fetchImpl: async () => new Response(article, { status: 200, headers: { 'content-type': 'text/html' } }), observedAt: '2026-08-24T20:00:00Z' })
    const report = { checkedAt: '2026-08-24T20:00:00Z', changes: fetched.observations }
    const [row] = buildMonitoringCandidateRows(report)
    const stageObservation = { fingerprint: row.fingerprint, sourceId: row.source_id, sourceLabel: row.source_label, sourceUrl: row.source_url, observedAt: row.last_seen_at, title: row.title, summary: row.evidence.semanticSummary ?? row.summary, text: [row.evidence.current?.title, row.evidence.current?.textSample].filter(Boolean).join(' '), links: row.evidence.presentation_links ?? row.evidence.linkDelta?.added ?? [] }
    const voucher = extractMonitoringConcepts(stageObservation).find(claim => claim.concept_key === 'atlanta:on-demand-play:voucher-price')!
    const topic = { topic_key: 'on-demand-play', updated_at: '2026-08-18T00:00:00Z', sources: [], article: { lede: 'On-Demand Play.', sections: [{ key: 'how-to-play', title: 'How to play', facts: [] }], unknowns: [], contradictions: [], recent_changes: [] } }
    expect(monitoringConceptBaselineFromInfo(voucher, topic)).toBeNull()
    const resolution = reconcileMonitoringObservation(stageObservation, null, voucher)
    const closure = projectRegisteredFactResolution(resolution, stageObservation, topic)!
    expect(closure.mutation).not.toBeNull()
    const readback = { ...topic, article: closure.mutation!.article, sources: closure.mutation!.sources, updated_at: closure.mutation!.updated_at }
    expect(row.status).toBe('unread')
    expect(closure.receipt.disposition).toBe('canonical_applied')
    expect(verifyRegisteredFactReadback(closure.receipt, readback)).toBe(true)
    expect(readback.article.sections[0].facts).toContainEqual({ label: 'Voucher price', value: '$5 increments' })
  })

  it('rejects off-host, non-HTTPS, credentials and paths outside the allowlist', () => {
    expect(canonicalNewsletterUrl('https://evil.example/global/en-us/magiccon-news/2026/a.html', 'https://www.mtgfestivals.com', policy)).toBeNull()
    expect(canonicalNewsletterUrl('http://www.mtgfestivals.com/global/en-us/magiccon-news/2026/a.html', 'https://www.mtgfestivals.com', policy)).toBeNull()
    expect(canonicalNewsletterUrl('https://user:pass@www.mtgfestivals.com/global/en-us/magiccon-news/2026/a.html', 'https://www.mtgfestivals.com', policy)).toBeNull()
    expect(canonicalNewsletterUrl('https://www.mtgfestivals.com/global/en-us/magiccon-news.html', 'https://www.mtgfestivals.com', policy)).toBeNull()
  })

  it('rejects redirects and isolates failed and oversized pages', async () => {
    const links = [
      { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/redirect.html', label: 'Redirect' },
      { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/large.html', label: 'Large' },
      { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/good.html', label: 'Good' },
    ]
    const fetchImpl = async (url: string) => {
      if (url.includes('redirect')) return new Response('', { status: 302, headers: { location: 'https://evil.example/' } })
      if (url.includes('large')) return new Response('x'.repeat(513), { status: 200, headers: { 'content-type': 'text/html', 'content-length': '513' } })
      return new Response('<main>Sunday show floor hours are 10 AM–7 PM.</main>', { status: 200, headers: { 'content-type': 'text/html' } })
    }
    const result = await fetchNewsletterPages({ links, policy, limits, fetchImpl, observedAt: '2026-08-24T20:00:00Z' })
    expect(result.observations).toHaveLength(1)
    expect(result.failures.map((item: { error: string }) => item.error)).toEqual(expect.arrayContaining(['redirect rejected (302)', expect.stringContaining('oversized response')]))
    const monitorSource = await readFile(path.join(process.cwd(), 'scripts', 'monitoring_watch_check.mjs'), 'utf8')
    expect(result).toMatchObject({ coverageStatus: 'partial', fetchedCount: 1, attemptedCount: 3 })
    expect(Object.keys(result.seen)).toEqual([links[2].url])
    expect(monitorSource).toContain('failures.push(...intake.failures.map(')
    expect(monitorSource).toContain('failures: intake.failures,')
    expect(monitorSource).toContain('Partial coverage:')
    expect(monitorSource).toContain('missingDiscoverySourceIds.length === 0')
  })

  it('reports budget omissions without advancing unseen fingerprints and rotates tracked pages', async () => {
    const links = Array.from({ length: 6 }, (_, index) => ({ url: `https://www.mtgfestivals.com/global/en-us/magiccon-news/atlanta-${index}.html`, label: `Atlanta ${index}` }))
    const seen = Object.fromEntries(links.map(link => [link.url, 'old']))
    const fetchImpl = async () => new Response('<main>Unchanged</main>', { headers: { 'content-type': 'text/html' } })
    const first = await fetchNewsletterPages({ links, seen, policy, limits, fetchImpl, observedAt: '2026-09-06T10:00:00Z' })
    expect(first).toMatchObject({ coverageStatus: 'partial', fetchedCount: 4, attemptedCount: 4 })
    expect(first.unfetched.map((link: { url: string }) => link.url)).toEqual(links.slice(4).map(link => link.url))
    expect(first.seen[links[4].url]).toBe('old')
    expect(first.lastFetchedAt[links[4].url]).toBeUndefined()
    const next = planNewsletterFetch({ links, initialized: true, discoveredUrls: links.map(link => link.url), seen: first.seen, lastFetchedAt: first.lastFetchedAt })
    expect(next.linksToFetch.slice(0, 2)).toEqual(links.slice(4))
    const newLink = { ...links[0], url: links[0].url.replace('atlanta-0', 'atlanta-new') }
    const prioritized = planNewsletterFetch({ links: [...links, newLink], initialized: true, discoveredUrls: links.map(link => link.url), seen: first.seen, lastFetchedAt: first.lastFetchedAt })
    expect(prioritized.linksToFetch[0]).toEqual(newLink)
  })

  it('discovers beyond twelve links and rotates bounded fetches through every candidate', async () => {
    const html = Array.from({ length: 14 }, (_, index) => `<a href="/global/en-us/magiccon-news/update-${index}.html">Monthly news ${index}</a>`).join('')
    const result = discoverNewsletterCoverage([{ id: 'global-magiccon-news', url: 'https://www.mtgfestivals.com/', html }], policy, limits)
    expect(result.links).toHaveLength(14)
    let seen = {}
    let lastFetchedAt = {}
    const visited = new Set<string>()
    const fetchImpl = async (url: string) => { visited.add(url); return new Response('<main>Monthly announcement.</main>', { headers: { 'content-type': 'text/html' } }) }
    for (let day = 1; day <= 4; day += 1) {
      const plan = planNewsletterFetch({ links: result.links, initialized: true, discoveredUrls: result.links.map((link: { url: string }) => link.url), seen, lastFetchedAt })
      const fetched = await fetchNewsletterPages({ links: plan.linksToFetch, seen, lastFetchedAt, policy, limits, fetchImpl, observedAt: `2026-09-0${day}T10:00:00Z` })
      expect(fetched.fetchedCount).toBe(4)
      expect(fetched.coverageStatus).toBe('partial')
      expect(fetched.unfetched).toHaveLength(10)
      seen = fetched.seen
      lastFetchedAt = fetched.lastFetchedAt
    }
    expect(visited.size).toBe(14)
    const newAtlanta = { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/atlanta-new.html', label: 'Atlanta news' }
    expect(planNewsletterFetch({ links: [...result.links, newAtlanta], initialized: true, discoveredUrls: result.links.map((link: { url: string }) => link.url), seen, lastFetchedAt }).linksToFetch[0]).toEqual(newAtlanta)
  })

  it('fetches body-only Atlanta news, excludes shared navigation, and retains uncertain generic news', async () => {
    const links = ['september', 'october', 'november', 'december'].map(month => ({ url: `https://www.mtgfestivals.com/global/en-us/magiccon-news/${month}.html`, label: `${month} newsletter` }))
    const bodies = [
      '<nav>MagicCon Amsterdam</nav><main>MagicCon Atlanta adds a welcome party.</main>',
      '<main>MagicCon Amsterdam announces show hours.</main><footer>MagicCon Atlanta</footer>',
      '<nav>Atlanta</nav><main>A new seasonal announcement is coming soon.</main><footer>Atlanta</footer>',
    ]
    const fetchImpl = async (url: string) => new Response(bodies[links.findIndex(link => link.url === url)], { headers: { 'content-type': 'text/html' } })
    const result = await fetchNewsletterPages({ links, policy, limits: { ...limits, maxPages: 3 }, fetchImpl, observedAt: '2026-09-06T10:00:00Z' })
    expect(result.observations.map((item: { geographicRelevance: string }) => item.geographicRelevance)).toEqual(['atlanta', 'uncertain'])
    expect(result.observations[1].semanticSummary).not.toContain('Atlanta')
    expect(result.inspectedNonAtlanta).toEqual([links[1]])
    expect(result.seen[links[1].url]).toBeTruthy()
    expect(result).toMatchObject({ uncertainCount: 1, coverageStatus: 'partial' })
    expect(result.unfetched).toEqual([{ ...links[3], reason: 'article-page-budget' }])
    expect(result.seen[links[3].url]).toBeUndefined()
  })

  it('keeps Amsterdam articles with trailing Atlanta promotion and generic mixed-city articles uncertain', async () => {
    const links = [
      { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/know-before-you-go-amsterdam.html', label: 'Know Before You Go: MagicCon Amsterdam' },
      { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/july-newsletter.html', label: 'July newsletter' },
      { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/august-newsletter.html', label: 'August newsletter' },
    ]
    const bodies = [
      '<article><h1>Know Before You Go: MagicCon Amsterdam</h1><p>Welcome newly announced guests to MagicCon Amsterdam.</p><p>Join us this November for MagicCon: Atlanta! Badges are now on sale.</p></article>',
      '<article><p>Amsterdam welcomes newly announced guests.</p><p>Atlanta badges are now on sale.</p></article>',
      '<article><p>MagicCon Amsterdam welcomes newly announced guests.</p><p>Join us at MagicCon Atlanta.</p></article>',
    ]
    const fetchImpl = async (url: string) => new Response(bodies[links.findIndex(link => link.url === url)], { headers: { 'content-type': 'text/html' } })
    const result = await fetchNewsletterPages({ links, policy, limits, fetchImpl, observedAt: '2026-09-06T10:00:00Z' })
    expect(result.observations).toHaveLength(3)
    expect(result.observations.every((item: { geographicRelevance: string }) => item.geographicRelevance === 'uncertain')).toBe(true)
    expect(result.inspectedNonAtlanta).toEqual([])
    expect(result.observations[0].semanticSummary).toContain('MagicCon: Atlanta')
    const rows = buildMonitoringCandidateRows({ checkedAt: '2026-09-06T10:00:00Z', changes: result.observations })
    expect(rows.every(row => row.destination !== 'Home')).toBe(true)
  })

  it('uses explicit initialization without rejecting articles before inspecting their body', () => {
    const atlanta = { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/know-before-you-go-atlanta.html', label: 'Know Before You Go: Atlanta' }
    const amsterdam = { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/know-before-you-go-amsterdam.html', label: 'Show hours and Atlanta preview mentioned in body only' }
    const candidates = [atlanta, { ...amsterdam, label: 'Know Before You Go: Amsterdam' }]
    const initial = planNewsletterFetch({ links: candidates, initialized: false })
    expect(initial).toMatchObject({ initialBaseline: true, eligible: candidates, linksToFetch: candidates })
    expect(planNewsletterFetch({ links: [atlanta], initialized: false, seen: { [atlanta.url]: 'fingerprint' } }).linksToFetch).toEqual([])
    const later = planNewsletterFetch({ links: [atlanta], initialized: true, discoveredUrls: [atlanta.url], seen: {} })
    expect(later).toMatchObject({ initialBaseline: false, linksToFetch: [atlanta] })
    const newlyDiscovered = planNewsletterFetch({ links: [atlanta], initialized: true, discoveredUrls: [], seen: {} })
    expect(newlyDiscovered.linksToFetch).toEqual([atlanta])
  })
})
