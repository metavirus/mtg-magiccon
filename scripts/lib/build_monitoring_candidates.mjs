import crypto from 'node:crypto'
import { routeMonitoringFinding } from './monitoring_action_router.mjs'

function summarize(change) {
  const added = change.linkDelta?.added ?? []
  const removed = change.linkDelta?.removed ?? []
  const parts = []
  if (added.length) parts.push(`${added.length} link${added.length === 1 ? '' : 's'} added: ${added.slice(0, 4).join('; ')}`)
  if (removed.length) parts.push(`${removed.length} link${removed.length === 1 ? '' : 's'} removed: ${removed.slice(0, 4).join('; ')}`)
  if (!parts.length) parts.push('Page text or shared navigation changed; inspect the captured source evidence before deciding.')
  return parts.join(' ')
}

export function buildMonitoringCandidateRows(report) {
  const grouped = new Map()
  for (const change of Array.isArray(report.changes) ? report.changes : []) {
    const added = change.linkDelta?.added ?? []
    const removed = change.linkDelta?.removed ?? []
    const deltaKey = added.length || removed.length
      ? crypto.createHash('sha256').update(JSON.stringify({ added, removed })).digest('hex')
      : `source:${change.id}`
    const existing = grouped.get(deltaKey)
    if (existing) existing.sourceIds.push(change.id)
    else grouped.set(deltaKey, { representative: change, sourceIds: [change.id] })
  }

  return [...grouped.values()].map(({ representative: change, sourceIds }) => {
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
      evidence: {
        previous: change.previous,
        current: change.current,
        linkDelta: change.linkDelta,
        priority: change.priority,
        homeWorthyWhen: change.homeWorthyWhen,
        monitorCheckedAt: report.checkedAt,
        sourceIds,
      },
      last_seen_at: report.checkedAt,
      updated_at: report.checkedAt,
    }
    const plan = routeMonitoringFinding({ ...row, status: 'authorized', decision: 'yes' })
    return plan.execution_status === 'queued'
      ? {
          ...row,
          action_type: plan.action_type,
          action_payload: {
            ...plan.action_payload,
            action_fingerprint: plan.action_fingerprint,
            approval_label: 'Publish reviewed Activity alert',
          },
          review_question: 'Publish these reviewed official links to Activity?',
          execution_status: 'not_started',
          canonical_target: plan.canonical_target,
          rollback_payload: plan.rollback_payload,
        }
      : row
  })
}
