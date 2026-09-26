import { createHash } from 'node:crypto'

const hash = value => createHash('sha256').update(value).digest('hex')
const compact = value => String(value ?? '').replace(/\s+/g, ' ').trim()

// This public event key is embedded by the official page; it is not a credential.
export function artistDirectoryFeedUrl(html, sourceUrl, config) {
  const page = new URL(sourceUrl)
  if (page.origin !== 'https://mcatlanta.mtgfestivals.com' || page.pathname !== '/en-us/art-of-magic/artist-directory.html') throw new Error('Artist directory page identity mismatch')
  const block = html.match(/\.growTixExhibitors\(\s*\{([\s\S]*?)\}\s*\)/)?.[1]
  const key = block?.match(/gtAPIKey\s*:\s*['"]([^'"]+)['"]/)?.[1]
  const category = block?.match(/gtCategory\s*:\s*['"]([^'"]+)['"]/)?.[1]
  if (!key || key !== config.publicEventKey || category !== config.categoryId) throw new Error('Artist directory widget identity missing or changed; feed coverage unavailable')
  return `https://conventions.leapevent.tech/api/space_orders?specials=1&key=${encodeURIComponent(key)}&category=${encodeURIComponent(category)}&search_term=`
}

export function parseArtistDirectoryFeed(payload, sourceUrl, config) {
  if (String(payload?.event_id) !== config.eventId || payload?.event_slug !== config.eventSlug) throw new Error('Artist directory feed event identity mismatch')
  if (!Array.isArray(payload.space_orders) || payload.space_orders.length === 0) throw new Error('Artist directory feed empty or unparsed; roster coverage unavailable')
  const ids = new Set()
  return payload.space_orders.map(row => {
    const id = compact(row.id)
    const name = compact(row.company)
    if (!/^\d+$/.test(id) || !name || ids.has(id) || !row.global_categories?.some(category => String(category.id) === config.categoryId)) throw new Error('Artist directory feed has invalid, duplicate, or wrong-category roster entries')
    ids.add(id)
    const profileUrl = new URL(`${new URL(sourceUrl).pathname.replace(/\.html$/, '')}/artist-showroom.html`, sourceUrl)
    profileUrl.searchParams.set('gtID', id)
    return {
      id, name, booth: compact(row.booth), profileUrl: profileUrl.toString(),
      description: compact(row.description), website: compact(row.website), storeUrl: compact(row.store_url),
      imageUrl: compact(row.image?.big), featured: row.featured === true,
      categories: row.global_categories.map(category => ({ id: String(category.id), name: compact(category.name) })).sort((a, b) => a.id.localeCompare(b.id)),
      tags: (row.tags ?? []).map(tag => ({ id: String(tag.id), name: compact(tag.tag ?? tag.name) })).sort((a, b) => a.id.localeCompare(b.id)),
    }
  }).sort((a, b) => a.id.localeCompare(b.id))
}

export async function artistDirectoryFingerprint({ html, sourceUrl, config, page, fetchText }) {
  const feedUrl = artistDirectoryFeedUrl(html, sourceUrl, config)
  const response = await fetchText(feedUrl)
  if (!response.ok) throw new Error(`Artist directory feed HTTP ${response.status}`)
  let payload
  try { payload = JSON.parse(response.html) } catch { throw new Error('Artist directory feed is not valid JSON; roster coverage unavailable') }
  const artists = parseArtistDirectoryFeed(payload, sourceUrl, config)
  const rosterHash = hash(JSON.stringify(artists))
  return {
    ...page,
    contentHash: hash(JSON.stringify({ pageContentHash: page.contentHash, rosterHash })),
    contentSample: `${page.contentSample}\nArtist directory: ${artists.length} artists.\n${artists.map(artist => `${artist.name} | Booth ${artist.booth || 'not supplied'} | ${artist.profileUrl}`).join('\n')}`,
    contentRegion: `${page.contentRegion}+official_artist_feed`,
    artistDirectory: { status: 'complete', feedUrl, eventId: config.eventId, eventSlug: config.eventSlug, categoryId: config.categoryId, count: artists.length, rosterHash, artists },
  }
}
