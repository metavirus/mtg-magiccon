import { createHash } from 'node:crypto'

export const DEFAULT_NEWSLETTER_LIMITS = Object.freeze({
  maxLinks: 12,
  maxPages: 4,
  maxBytes: 192 * 1024,
  timeoutMs: 8_000,
  maxTextChars: 48_000,
})

function decodeEntities(text) {
  return text.replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
}

export function visibleTextFromHtml(html, maxChars = DEFAULT_NEWSLETTER_LIMITS.maxTextChars) {
  return decodeEntities(html)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxChars)
}

export function newsletterArticleText(html, maxChars = DEFAULT_NEWSLETTER_LIMITS.maxTextChars) {
  const content = html.replace(/<(nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  const article = content.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)
  const main = content.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)
  return visibleTextFromHtml(article?.[1] ?? main?.[1] ?? content.replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' '), maxChars)
}

function newsletterRelevance(link, text) {
  if (isAtlantaNewsletterLink(link) || /\batlanta\b/i.test(text)) return 'atlanta'
  // Only a named other location is grounds to suppress an inspected article.
  // Generic announcements remain candidates for editorial judgment.
  const otherLocation = /\b(amsterdam|las[ -]vegas|chicago|philadelphia|barcelona)\b/i
  if (otherLocation.test(`${link.label ?? ''} ${link.url}`) || /\bMagicCon\s*[:-]?\s*(Amsterdam|Las Vegas|Chicago|Philadelphia|Barcelona)\b/i.test(text)) return 'other-location'
  return 'uncertain'
}

export function canonicalNewsletterUrl(value, baseUrl, policy) {
  try {
    const url = new URL(value, baseUrl)
    url.hash = ''
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    if (url.hostname.toLowerCase() !== policy.allowedHost.toLowerCase()) return null
    if (!policy.pathPrefixes.some(prefix => url.pathname.startsWith(prefix))) return null
    url.hostname = url.hostname.toLowerCase()
    url.searchParams.sort()
    return url.toString()
  } catch {
    return null
  }
}

export function discoverNewsletterLinks(pages, policy, limits = DEFAULT_NEWSLETTER_LIMITS) {
  return discoverNewsletterCoverage(pages, policy, limits).links
}

export function discoverNewsletterCoverage(pages, policy, _limits = DEFAULT_NEWSLETTER_LIMITS) {
  const allowedSources = new Set(policy.discoverySourceIds)
  const found = new Map()
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  for (const page of pages) {
    if (!allowedSources.has(page.id)) continue
    for (const match of page.html.matchAll(anchorPattern)) {
      const label = visibleTextFromHtml(match[2], 160)
      const url = canonicalNewsletterUrl(match[1], page.url, policy)
      if (!url || !policy.linkPattern.test(`${label} ${new URL(url).pathname}`)) continue
      if (!found.has(url)) found.set(url, { url, label: label || 'Official MagicCon article', discoveredFrom: page.id })
    }
  }
  // Discovery reads already-fetched HTML. Cap network work after prioritization,
  // otherwise the source's first links permanently hide every later article.
  return { links: [...found.values()], unfetched: [] }
}

export function isAtlantaNewsletterLink(link) {
  return /atlanta/i.test(`${link.label ?? ''} ${link.url ?? ''}`)
}

export function planNewsletterFetch({ links, initialized, discoveredUrls = [], seen = {}, lastFetchedAt = {} }) {
  const eligible = [...new Map(links.map(link => [link.url, link])).values()]
  const discovered = new Set(discoveredUrls)
  const newLinks = eligible.filter(link => !discovered.has(link.url))
  const unfingerprintedLinks = eligible.filter(link => !seen[link.url])
  const trackedLinks = eligible.filter(link => seen[link.url]).sort((a, b) => (lastFetchedAt[a.url] ?? '').localeCompare(lastFetchedAt[b.url] ?? ''))
  return {
    initialBaseline: !initialized,
    eligible,
    linksToFetch: !initialized ? unfingerprintedLinks : [...new Map([...newLinks, ...unfingerprintedLinks, ...trackedLinks].map(link => [link.url, link])).values()],
  }
}

async function readBoundedBody(response, maxBytes) {
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error(`oversized response (${declared} bytes; limit ${maxBytes})`)
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks = []
  let bytes = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    bytes += value.byteLength
    if (bytes > maxBytes) {
      await reader.cancel()
      throw new Error(`oversized response (limit ${maxBytes} bytes)`)
    }
    chunks.push(value)
  }
  const body = new Uint8Array(bytes)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength }
  return new TextDecoder().decode(body)
}

export async function fetchNewsletterPages({ links, policy, fetchImpl = fetch, limits = DEFAULT_NEWSLETTER_LIMITS, seen = {}, lastFetchedAt = {}, observedAt, suppressObservations = false }) {
  const observations = []
  const failures = []
  const nextSeen = { ...seen }
  const nextLastFetchedAt = { ...lastFetchedAt }
  const pageBudget = Math.min(limits.maxLinks ?? DEFAULT_NEWSLETTER_LIMITS.maxLinks, limits.maxPages)
  const unfetched = links.slice(pageBudget).map(link => ({ ...link, reason: 'article-page-budget' }))
  const inspectedNonAtlanta = []
  let uncertainCount = 0
  let attemptedCount = 0
  let fetchedCount = 0
  for (const link of links.slice(0, pageBudget)) {
    const safeUrl = canonicalNewsletterUrl(link.url, link.url, policy)
    if (!safeUrl) {
      failures.push({ url: link.url, label: link.label, error: 'URL rejected by newsletter policy' })
      continue
    }
    attemptedCount += 1
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), limits.timeoutMs)
    try {
      const response = await fetchImpl(safeUrl, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { accept: 'text/html,application/xhtml+xml', 'user-agent': 'MagicCon Atlanta companion monitor/1.0 (+https://metavirus.github.io/mtg-magiccon/)' },
      })
      if (response.status >= 300 && response.status < 400) throw new Error(`redirect rejected (${response.status})`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const contentType = response.headers.get('content-type') ?? ''
      if (!/^text\/html\b|^application\/xhtml\+xml\b/i.test(contentType)) throw new Error(`unsupported content type (${contentType || 'missing'})`)
      const html = await readBoundedBody(response, limits.maxBytes)
      const text = newsletterArticleText(html, limits.maxTextChars)
      const relevance = newsletterRelevance(link, text)
      if (relevance === 'other-location') inspectedNonAtlanta.push({ url: safeUrl, label: link.label })
      if (relevance === 'uncertain') uncertainCount += 1
      const fingerprint = createHash('sha256').update(text).digest('hex')
      if (relevance !== 'other-location' && !suppressObservations && seen[safeUrl] !== fingerprint) {
        observations.push({
          id: `newsletter:${createHash('sha256').update(safeUrl).digest('hex').slice(0, 16)}`,
          label: link.label || 'Official MagicCon article',
          url: safeUrl,
          priority: 'canonical',
          destination: 'Activity',
          fingerprint,
          semanticSummary: text,
          previous: seen[safeUrl] ? { textHash: seen[safeUrl] } : null,
          current: { status: response.status, title: link.label || '', textHash: fingerprint, linkHash: '', textSample: text },
          linkDelta: { added: [], removed: [] },
          intakeKind: 'first_party_newsletter',
          geographicRelevance: relevance,
          discoveredFrom: link.discoveredFrom,
        })
      }
      nextSeen[safeUrl] = fingerprint
      nextLastFetchedAt[safeUrl] = observedAt
      fetchedCount += 1
    } catch (error) {
      failures.push({ url: safeUrl, label: link.label, error: error.name === 'AbortError' ? `timeout after ${limits.timeoutMs}ms` : error.message })
    } finally {
      clearTimeout(timeout)
    }
  }
  return { observations, failures, unfetched, inspectedNonAtlanta, uncertainCount, coverageStatus: failures.length || unfetched.length ? 'partial' : 'complete', seen: nextSeen, lastFetchedAt: nextLastFetchedAt, discoveredCount: links.length, attemptedCount, fetchedCount, observedAt }
}
