import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
// @ts-expect-error Executable monitoring helper is an ESM script without declarations.
import { canonicalNewsletterUrl, discoverNewsletterLinks, fetchNewsletterPages, planNewsletterFetch } from '../../scripts/lib/first_party_newsletter_intake.mjs'
import { extractMonitoringConcepts } from '../../scripts/lib/monitoring_concept_reconciler.mjs'
import { buildMonitoringCandidateRows } from '../../scripts/lib/build_monitoring_candidates.mjs'

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
    expect(rawEvidence).toMatchObject({ status: 'archived', evidence: { intake_kind: 'first_party_newsletter' } })
    const repeat = await fetchNewsletterPages({ links, policy, limits, fetchImpl, seen: first.seen, observedAt: '2026-08-24T21:00:00Z' })
    expect(repeat.observations).toEqual([])
    const baseline = await fetchNewsletterPages({ links, policy, limits, fetchImpl, observedAt: '2026-08-24T19:00:00Z', suppressObservations: true })
    expect(baseline.observations).toEqual([])
    expect(Object.keys(baseline.seen)).toEqual([links[0].url])
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
    expect(monitorSource).not.toContain('failures.push(...intake.failures')
    expect(monitorSource).toContain('failures: intake.failures.slice(0, 8)')
  })

  it('uses explicit initialization and strict index-record Atlanta relevance', () => {
    const atlanta = { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/know-before-you-go-atlanta.html', label: 'Know Before You Go: Atlanta' }
    const amsterdam = { url: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/2026/know-before-you-go-amsterdam.html', label: 'Show hours and Atlanta preview mentioned in body only' }
    const initial = planNewsletterFetch({ links: [atlanta, { ...amsterdam, label: 'Know Before You Go: Amsterdam' }], initialized: false })
    expect(initial).toMatchObject({ initialBaseline: true, eligible: [atlanta], linksToFetch: [atlanta] })
    expect(planNewsletterFetch({ links: [atlanta], initialized: false, seen: { [atlanta.url]: 'fingerprint' } }).linksToFetch).toEqual([])
    const later = planNewsletterFetch({ links: [atlanta], initialized: true, discoveredUrls: [atlanta.url], seen: {} })
    expect(later).toMatchObject({ initialBaseline: false, linksToFetch: [atlanta] })
    const newlyDiscovered = planNewsletterFetch({ links: [atlanta], initialized: true, discoveredUrls: [], seen: {} })
    expect(newlyDiscovered.linksToFetch).toEqual([atlanta])
  })
})
