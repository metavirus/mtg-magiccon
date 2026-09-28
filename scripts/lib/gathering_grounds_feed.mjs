import { createHash } from 'node:crypto'

const hash = value => createHash('sha256').update(value).digest('hex')
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim()
const pagePath = '/en-us/experience/the-gathering-grounds/the-gathering-grounds-schedule.html'

// The official gt-scripts-min.js constructs this public widget transport.
export function gatheringGroundsFeedUrl(html, sourceUrl, config) {
  const page = new URL(sourceUrl)
  if (page.origin !== 'https://mcatlanta.mtgfestivals.com' || page.pathname !== pagePath) throw new Error('Gathering Grounds page identity mismatch')
  const block = html.match(/\.growTixScheduleSlim\(\s*\{([\s\S]*?)\}\s*\)/)?.[1]
  const key = block?.match(/gtAPIKey\s*:\s*['"]([^'"]+)['"]/)?.[1]
  const category = block?.match(/gtCategory\s*:\s*['"]([^'"]+)['"]/)?.[1]
  if (!key || key !== config.publicEventKey || category !== config.categoryId) throw new Error('Gathering Grounds widget identity missing or changed; schedule coverage unavailable')
  return `https://conventions.leapevent.tech/api/schedules?key=${encodeURIComponent(key)}&category=${encodeURIComponent(category)}`
}

// Retain all supplied fields, including participant/link/status changes, without
// treating JSON key ordering or category/tag ordering as a schedule change.
function stable(value) {
  if (typeof value === 'string') return compact(value)
  if (Array.isArray(value)) return value.map(stable).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]))
  return value
}

export function parseGatheringGroundsFeed(payload, sourceUrl, config) {
  if (String(payload?.event_id) !== config.eventId || payload?.event_slug !== config.eventSlug) throw new Error('Gathering Grounds feed event identity mismatch')
  if (!Array.isArray(payload.schedules) || !payload.schedules.length) throw new Error('Gathering Grounds feed empty or unparsed; schedule coverage unavailable')
  const ids = new Set()
  return payload.schedules.map(row => {
    const id = compact(row?.id)
    const title = compact(row?.title)
    const startTime = compact(row?.start_time)
    const endTime = compact(row?.end_time)
    const validTime = value => /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) && Number.isFinite(Date.parse(value.replace(' ', 'T') + 'Z'))
    if (!/^\d+$/.test(id) || !title || ids.has(id) || !Array.isArray(row.global_categories) || !row.global_categories.some(category => String(category.id) === config.categoryId)) throw new Error('Gathering Grounds feed has invalid, duplicate, or wrong-category sessions')
    if (!validTime(startTime) || (!row.no_end_time && (!validTime(endTime) || endTime < startTime))) throw new Error('Gathering Grounds session time missing or invalid; schedule coverage unavailable')
    ids.add(id)
    const detailUrl = new URL(`${pagePath.replace(/\.html$/, '')}/schedule-event-information.html`, sourceUrl)
    detailUrl.searchParams.set('gtID', id)
    return { id, title, startTime, endTime, location: compact(row.location), description: compact(row.description), detailUrl: detailUrl.toString(), source: stable(row) }
  }).sort((a, b) => a.id.localeCompare(b.id))
}

export async function fetchGatheringGroundsFeedText(url, { fetchImpl = fetch, timeoutMs = 8000, maxBytes = 524288 } = {}) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs), redirect: 'error', headers: { 'user-agent': 'MagicCon Atlanta companion monitor/1.0' } })
  if (!response.ok) return { ok: false, status: response.status, html: '' }
  const reader = response.body.getReader()
  const chunks = []
  let bytes = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maxBytes) throw new Error('Gathering Grounds feed exceeds response byte limit')
      chunks.push(Buffer.from(value))
    }
  } finally {
    await reader.cancel()
  }
  return { ok: true, status: response.status, html: Buffer.concat(chunks).toString('utf8') }
}

export async function gatheringGroundsFingerprint({ html, sourceUrl, config, page, fetchText = fetchGatheringGroundsFeedText }) {
  const feedUrl = gatheringGroundsFeedUrl(html, sourceUrl, config)
  const response = await fetchText(feedUrl)
  if (!response.ok) throw new Error(`Gathering Grounds feed HTTP ${response.status}`)
  let payload
  try { payload = JSON.parse(response.html) } catch { throw new Error('Gathering Grounds feed is not valid JSON; schedule coverage unavailable') }
  const sessions = parseGatheringGroundsFeed(payload, sourceUrl, config)
  const scheduleHash = hash(JSON.stringify(sessions))
  return {
    ...page,
    contentHash: hash(JSON.stringify({ pageContentHash: page.contentHash, scheduleHash })),
    contentSample: `${page.contentSample}\nGathering Grounds: ${sessions.length} sessions. Times as supplied by the official feed.\n${sessions.map(session => `${session.title} | ${session.startTime} - ${session.endTime} | ${session.location} | ${session.detailUrl}`).join('\n')}`,
    contentRegion: `${page.contentRegion}+official_gathering_grounds_feed`,
    gatheringGrounds: { status: 'complete', feedUrl, eventId: config.eventId, eventSlug: config.eventSlug, categoryId: config.categoryId, count: sessions.length, scheduleHash, sessions },
  }
}
