const DETAIL_PATH = /^\/en-us\/(?:experience|magic-play|info|badges|exhibitors|artists|guests)(?:\/(?:[^/]+\/)*[^/]+)?\.html$/i

function plainUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.hostname !== 'mcatlanta.mtgfestivals.com' || url.username || url.password || url.port) return null
    const eventId = url.searchParams.get('gtID')
    url.search = ''
    if (eventId) url.searchParams.set('gtID', eventId)
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

export function activeDetailCoverageExclusions(exclusions = [], checkedAt = new Date().toISOString()) {
  return exclusions.filter(item => plainUrl(item.url) && item.reason?.trim() && item.reviewedAt && Date.parse(item.reviewedAt) <= Date.parse(checkedAt) && Date.parse(item.reviewAfter) > Date.parse(checkedAt))
}

export function relevantDetailCoverageGaps(currentLinks = [], watchedUrls = [], sourceId, exclusions = [], checkedAt) {
  const watched = new Set(watchedUrls.map(plainUrl).filter(Boolean))
  const excluded = new Set(activeDetailCoverageExclusions(exclusions, checkedAt).map(item => plainUrl(item.url)))
  const gaps = new Map()
  for (const link of currentLinks) {
    const url = plainUrl(link.url)
    if (!url || watched.has(url) || excluded.has(url) || !DETAIL_PATH.test(new URL(url).pathname)) continue
    gaps.set(url, { sourceId, url, label: String(link.label ?? '').trim() })
  }
  return [...gaps.values()].sort((a, b) => a.url.localeCompare(b.url))
}

export function retainedDetailCoverageGaps(existing = [], discovered = [], watchedUrls = [], exclusions = [], checkedAt) {
  const watched = new Set(watchedUrls.map(plainUrl).filter(Boolean))
  const excluded = new Set(activeDetailCoverageExclusions(exclusions, checkedAt).map(item => plainUrl(item.url)))
  const gaps = new Map([...existing, ...discovered].filter(gap => plainUrl(gap.url) && !watched.has(plainUrl(gap.url)) && !excluded.has(plainUrl(gap.url))).map(gap => [plainUrl(gap.url), gap]))
  return [...gaps.values()].sort((a, b) => a.url.localeCompare(b.url))
}
