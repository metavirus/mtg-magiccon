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
      if (found.size >= limits.maxLinks) return [...found.values()]
    }
  }
  return [...found.values()]
}

export function isAtlantaNewsletterLink(link) {
  return /atlanta/i.test(`${link.label ?? ''} ${link.url ?? ''}`)
}

export function planNewsletterFetch({ links, initialized, discoveredUrls = [], seen = {} }) {
  const eligible = links.filter(isAtlantaNewsletterLink)
  const discovered = new Set(discoveredUrls)
  const newLinks = eligible.filter(link => !discovered.has(link.url))
  const unfingerprintedLinks = eligible.filter(link => !seen[link.url])
  const trackedLinks = eligible.filter(link => seen[link.url])
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

export async function fetchNewsletterPages({ links, policy, fetchImpl = fetch, limits = DEFAULT_NEWSLETTER_LIMITS, seen = {}, observedAt, suppressObservations = false }) {
  const observations = []
  const failures = []
  const nextSeen = { ...seen }
  for (const link of links.slice(0, limits.maxPages)) {
    const safeUrl = canonicalNewsletterUrl(link.url, link.url, policy)
    if (!safeUrl) continue
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
      const text = visibleTextFromHtml(html, limits.maxTextChars)
      const fingerprint = createHash('sha256').update(text).digest('hex')
      if (!suppressObservations && seen[safeUrl] !== fingerprint) {
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
          discoveredFrom: link.discoveredFrom,
        })
      }
      nextSeen[safeUrl] = fingerprint
    } catch (error) {
      failures.push({ url: safeUrl, label: link.label, error: error.name === 'AbortError' ? `timeout after ${limits.timeoutMs}ms` : error.message })
    } finally {
      clearTimeout(timeout)
    }
  }
  return { observations, failures, seen: nextSeen, discoveredCount: links.length, fetchedCount: Math.min(links.length, limits.maxPages), observedAt }
}
