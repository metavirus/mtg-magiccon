const OFFICIAL_HOSTS = new Set(['mcatlanta.mtgfestivals.com', 'www.mtgfestivals.com', 'mtgfestivals.com'])
const MAGIC_PLAY_PATH = /\/(magic-play|ticketed-play|prize-tix|prize-wall|play-guide|on-demand)(?:[/.#?-]|$)/i

function requiresMapping(finding, reason) {
  return { classification: 'requires_mapping', finding_status: 'needs_review', action_type: null, execution_status: 'not_started', review_actions: [], reason, finding_fingerprint: finding?.fingerprint ?? null }
}

function parseOfficialLink(record) {
  if (typeof record !== 'string') return null
  const separator = record.lastIndexOf(' -> ')
  const rawUrl = separator >= 0 ? record.slice(separator + 4) : record
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' || !OFFICIAL_HOSTS.has(url.hostname.toLowerCase())) return null
    url.hash = ''
    return { label: separator >= 0 ? record.slice(0, separator).trim() : '', url: url.toString() }
  } catch {
    return null
  }
}

export function classifyMonitoringFinding(finding) {
  if (!finding || typeof finding !== 'object') return requiresMapping(finding, 'Finding payload is unavailable.')
  if (!/^[a-f0-9]{64}$/i.test(finding.fingerprint ?? '')) return requiresMapping(finding, 'Finding fingerprint is missing or invalid.')
  const evidence = finding.evidence
  const delta = evidence?.linkDelta ?? evidence?.link_delta
  const added = Array.isArray(delta?.added) ? delta.added : []
  const removed = Array.isArray(delta?.removed) ? delta.removed : []
  const rawSourceIds = evidence?.sourceIds ?? evidence?.source_ids
  const sourceIds = Array.isArray(rawSourceIds) ? [...new Set(rawSourceIds)].sort() : []
  const observedAt = evidence?.monitorCheckedAt ?? evidence?.monitor_checked_at
  if (!observedAt || !sourceIds.length || !added.length) return requiresMapping(finding, 'Complete source IDs, retrieval time, and added-link evidence are required.')
  if (removed.length || delta?.truncated) return requiresMapping(finding, 'Removed or truncated link evidence requires interpretation before classification.')
  const links = added.map(parseOfficialLink)
  if (links.some((link) => !link)) return requiresMapping(finding, 'Every informational link must be HTTPS on an allowlisted first-party MagicCon host.')
  const relevantLinks = [...new Map(links.filter((link) => MAGIC_PLAY_PATH.test(new URL(link.url).pathname)).map((link) => [`${link.label}\n${link.url}`, link])).values()]
    .sort((a, b) => `${a.label}\n${a.url}`.localeCompare(`${b.label}\n${b.url}`))
  if (!relevantLinks.length) return requiresMapping(finding, 'No allowlisted Magic Play link class was found.')
  return {
    classification: 'informational_official_links', finding_status: 'unread', action_type: null, execution_status: 'not_started',
    review_actions: ['mark_read', 'archive'], reason: null, finding_fingerprint: finding.fingerprint,
    presentation: {
      title: 'Atlanta pages now expose Magic Play links',
      summary: 'Official Atlanta navigation now links to Magic Play resources. Open the publisher pages for schedules, on-demand play, and Prize Tix details.',
      links: relevantLinks,
      source: { owner: 'MagicCon / ReedPop', source_ids: sourceIds, observed_at: observedAt },
      truth_class: 'source_observation', canonical_fact_mutation: false,
    },
  }
}

export const routeMonitoringFinding = classifyMonitoringFinding
