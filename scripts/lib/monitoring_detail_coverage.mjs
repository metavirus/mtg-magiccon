const DETAIL_PATH = /^\/en-us\/(?:experience|magic-play|info|badges|exhibitors|artists|guests)\/(?:[^/]+\/)*[^/]+\.html$/i

function plainUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'mcatlanta.mtgfestivals.com') return null
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function newRelevantDetailCoverageGaps(previousLinks = [], currentLinks = [], watchedUrls = [], sourceId) {
  if (!Array.isArray(previousLinks)) return [] // No accepted link baseline to compare yet.
  const previous = new Set(previousLinks.map(link => plainUrl(link.url)).filter(Boolean))
  const watched = new Set(watchedUrls.map(plainUrl).filter(Boolean))
  const gaps = new Map()
  for (const link of currentLinks) {
    const url = plainUrl(link.url)
    if (!url || previous.has(url) || watched.has(url) || !DETAIL_PATH.test(new URL(url).pathname)) continue
    gaps.set(url, { sourceId, url, label: String(link.label ?? '').trim() })
  }
  return [...gaps.values()].sort((a, b) => a.url.localeCompare(b.url))
}

export function retainedDetailCoverageGaps(existing = [], discovered = [], watchedUrls = []) {
  const watched = new Set(watchedUrls.map(plainUrl).filter(Boolean))
  const gaps = new Map([...existing, ...discovered].filter(gap => plainUrl(gap.url) && !watched.has(plainUrl(gap.url))).map(gap => [plainUrl(gap.url), gap]))
  return [...gaps.values()].sort((a, b) => a.url.localeCompare(b.url))
}
