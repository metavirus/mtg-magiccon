import crypto from 'node:crypto'
import { classifyMonitoringFinding } from './monitoring_action_router.mjs'
import { routeTicketedPlaySoldOutTransitions } from './ticketed_play_inventory.mjs'

function summarize(change) {
  const added = change.linkDelta?.added ?? []
  const removed = change.linkDelta?.removed ?? []
  const parts = []
  if (added.length) parts.push(`${added.length} link${added.length === 1 ? '' : 's'} added: ${added.slice(0, 4).join('; ')}`)
  if (removed.length) parts.push(`${removed.length} link${removed.length === 1 ? '' : 's'} removed: ${removed.slice(0, 4).join('; ')}`)
  if (!parts.length) parts.push('Page text or shared navigation changed; inspect the captured source evidence before deciding.')
  return parts.join(' ')
}

export function buildMonitoringCandidateRows(report, routingContext = {}) {
  const ticketedRows = (Array.isArray(report.changes) ? report.changes : [])
    .filter(change => change.intakeKind === 'ticketed_play_inventory')
    .flatMap(change => routeTicketedPlaySoldOutTransitions(change.transitions ?? [], {
      ...routingContext,
      checkedAt: report.checkedAt,
      availabilityWatches: change.availabilityWatches ?? [],
    }))
    .map(row => ({
      ...row,
      review_question: row.destination === 'Inbox'
        ? 'Persistent selection-impact alert; dismiss only after the affected companions have reviewed it.'
        : 'Informational grouped availability signal.',
      last_seen_at: report.checkedAt,
      updated_at: report.checkedAt,
    }))
  const grouped = new Map()
  for (const change of Array.isArray(report.changes) ? report.changes : []) {
    if (change.intakeKind === 'ticketed_play_inventory') continue
    const added = change.linkDelta?.added ?? []
    const removed = change.linkDelta?.removed ?? []
    const deltaKey = added.length || removed.length
      ? crypto.createHash('sha256').update(JSON.stringify({ added, removed })).digest('hex')
      : `source:${change.id}`
    const existing = grouped.get(deltaKey)
    if (existing) existing.sourceIds.push(change.id)
    else grouped.set(deltaKey, { representative: change, sourceIds: [change.id] })
  }

  return [...ticketedRows, ...[...grouped.values()].map(({ representative: change, sourceIds }) => {
    sourceIds.sort()
    const material = JSON.stringify({
      sourceIds,
      status: change.current?.status,
      added: change.linkDelta?.added ?? [],
      removed: change.linkDelta?.removed ?? [],
      textHash: sourceIds.length === 1 ? change.current?.textHash : undefined,
      linkHash: sourceIds.length === 1 ? change.current?.linkHash : undefined,
    })
    const row = {
      fingerprint: crypto.createHash('sha256').update(material).digest('hex'),
      source_id: change.id,
      source_label: change.label,
      source_url: change.url,
      destination: change.destination === 'Home' ? 'Home' : 'Activity',
      title: `${change.label} changed`,
      summary: summarize(change),
      review_question: `Action mapping required before approving this ${change.label} change.`,
      status: 'needs_review',
      evidence: {
        previous: change.previous,
        current: change.current,
        linkDelta: change.linkDelta,
        priority: change.priority,
        homeWorthyWhen: change.homeWorthyWhen,
        monitorCheckedAt: report.checkedAt,
        sourceIds,
        semanticSummary: change.semanticSummary,
      },
      last_seen_at: report.checkedAt,
      updated_at: report.checkedAt,
    }
    const classification = classifyMonitoringFinding(row)
    if (change.intakeKind === 'first_party_newsletter') return {
      ...row,
      status: 'archived',
      review_question: 'Internal source evidence; registered claims are reconciled separately.',
      evidence: { ...row.evidence, intake_kind: change.intakeKind, discovered_from: change.discoveredFrom },
    }
    return classification.classification === 'informational_official_links'
      ? {
          ...row,
          status: 'unread',
          title: classification.presentation.title,
          summary: classification.presentation.summary,
          review_question: 'Mark as read or archive when this source update is no longer useful.',
          evidence: {
            ...row.evidence,
            presentation_links: classification.presentation.links,
            presentation: {
              source: classification.presentation.source,
              truth_class: classification.presentation.truth_class,
              canonical_fact_mutation: false,
            },
          },
        }
      : row
  })]
}
