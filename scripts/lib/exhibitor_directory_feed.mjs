import { createHash } from 'node:crypto'

const hash = value => createHash('sha256').update(value).digest('hex')
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim()
const text = value => typeof value === 'string' || typeof value === 'number' ? compact(value) : ''
// Retain source values without object coercion, with deterministic key ordering
// so JSON property order alone cannot manufacture a changed-source finding.
const stableValue = value => Array.isArray(value) ? value.map(stableValue)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, stableValue(value[key])]))
    : value ?? null
const publicUrl = value => {
  const candidate = text(value)
  if (!candidate) return ''
  try {
    const url = new URL(/^(?:www\.|[\w-]+\.[a-z]{2,}(?:\/|$))/i.test(candidate) ? `https://${candidate}` : candidate)
    return ['https:', 'http:'].includes(url.protocol) ? url.toString() : ''
  } catch { return '' }
}

// A boolean exclusives flag is not an offer: the live directory returns true
// even for exhibitors with no listed promotions. Keep it only as source evidence.
export function normalizeExhibitorOffers(value) {
  const entries = Array.isArray(value) ? value : value == null ? [] : [value]
  return entries.flatMap(entry => {
    if (typeof entry === 'string') return compact(entry) ? [{ id: '', title: '', description: compact(entry), price: '', url: '', imageUrl: '' }] : []
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return []
    return [{
      id: text(entry.id), title: text(entry.title), description: text(entry.description),
      price: text(entry.price), url: publicUrl(entry.link ?? entry.url),
      imageUrl: publicUrl(entry.image?.big ?? entry.imageUrl ?? entry.image),
    }]
  })
}

// The public event key and category are bound by the owning official widget.
export function exhibitorDirectoryFeedUrl(html, sourceUrl, config) {
  const page = new URL(sourceUrl)
  if (page.origin !== 'https://mcatlanta.mtgfestivals.com' || page.pathname !== '/en-us/experience/exhibitors.html') throw new Error('Exhibitor directory page identity mismatch')
  const block = html.match(/\.growTixExhibitors\(\s*\{([\s\S]*?)\}\s*\)/)?.[1]
  const key = block?.match(/gtAPIKey\s*:\s*['"]([^'"]+)['"]/)?.[1]
  const category = block?.match(/gtCategory\s*:\s*['"]([^'"]+)['"]/)?.[1]
  if (!key || key !== config.publicEventKey || category !== config.categoryId) throw new Error('Exhibitor directory widget identity missing or changed; feed coverage unavailable')
  return `https://conventions.leapevent.tech/api/space_orders?specials=1&key=${encodeURIComponent(key)}&category=${encodeURIComponent(category)}&search_term=`
}

export function parseExhibitorDirectoryFeed(payload, sourceUrl, config) {
  if (String(payload?.event_id) !== config.eventId || payload?.event_slug !== config.eventSlug) throw new Error('Exhibitor directory feed event identity mismatch')
  if (!Array.isArray(payload.space_orders) || !payload.space_orders.length) throw new Error('Exhibitor directory feed empty or unparsed; roster coverage unavailable')
  const ids = new Set()
  return payload.space_orders.map(row => {
    const id = compact(row.id)
    const name = compact(row.company)
    // Official exhibitor records use blank category strings; membership is
    // established by the exact widget-bound request, unlike artist records.
    if (!/^\d+$/.test(id) || !name || ids.has(id)) throw new Error('Exhibitor directory feed has invalid or duplicate roster entries')
    ids.add(id)
    const profileUrl = new URL(`${new URL(sourceUrl).pathname.replace(/\.html$/, '')}/exhibitor-showroom.html`, sourceUrl)
    profileUrl.searchParams.set('gtID', id)
    return {
      id, name, booth: compact(row.booth), profileUrl: profileUrl.toString(),
      description: compact(row.description), website: compact(row.website), storeUrl: compact(row.store_url),
      imageUrl: compact(row.image?.big), featured: row.featured === true,
      specials: normalizeExhibitorOffers(row.specials), exclusives: normalizeExhibitorOffers(row.exclusives),
      promotionSource: { specials: stableValue(row.specials), exclusives: stableValue(row.exclusives) },
    }
  }).sort((a, b) => a.id.localeCompare(b.id))
}

export async function exhibitorDirectoryFingerprint({ html, sourceUrl, config, page, fetchText }) {
  const feedUrl = exhibitorDirectoryFeedUrl(html, sourceUrl, config)
  const response = await fetchText(feedUrl)
  if (!response.ok) throw new Error(`Exhibitor directory feed HTTP ${response.status}`)
  let payload
  try { payload = JSON.parse(response.html) } catch { throw new Error('Exhibitor directory feed is not valid JSON; roster coverage unavailable') }
  const exhibitors = parseExhibitorDirectoryFeed(payload, sourceUrl, config)
  const rosterHash = hash(JSON.stringify(exhibitors))
  return {
    ...page,
    contentHash: hash(JSON.stringify({ pageContentHash: page.contentHash, rosterHash })),
    contentSample: `${page.contentSample}\nExhibitor directory: ${exhibitors.length} exhibitors.\n${exhibitors.map(item => `${item.name} | Booth ${item.booth || 'not supplied'} | ${item.profileUrl}`).join('\n')}`,
    contentRegion: `${page.contentRegion}+official_exhibitor_feed`,
    exhibitorDirectory: { status: 'complete', feedUrl, eventId: config.eventId, eventSlug: config.eventSlug, categoryId: config.categoryId, count: exhibitors.length, rosterHash, exhibitors },
  }
}
