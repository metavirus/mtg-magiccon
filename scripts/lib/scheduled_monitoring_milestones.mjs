import { createHash } from 'node:crypto'

export function dueMonitoringMilestoneChanges(milestones = [], reached = {}, checkedAt) {
  const checkedTime = Date.parse(checkedAt)
  if (!Number.isFinite(checkedTime)) throw new Error(`Invalid monitoring checkedAt: ${checkedAt}`)

  const changes = []
  const nextReached = { ...reached }
  for (const milestone of milestones) {
    if (!milestone?.id || !milestone?.opensAt || nextReached[milestone.id]) continue
    const opensTime = Date.parse(milestone.opensAt)
    if (!Number.isFinite(opensTime)) throw new Error(`Invalid opensAt for monitoring milestone ${milestone.id}`)
    if (checkedTime < opensTime) continue

    const semanticSummary = milestone.semanticSummary || `${milestone.label} is now open.`
    const stableHash = createHash('sha256').update(JSON.stringify({ id: milestone.id, opensAt: milestone.opensAt, semanticSummary })).digest('hex')
    changes.push({
      id: milestone.id,
      label: milestone.label,
      url: milestone.url,
      priority: milestone.priority || 'canonical',
      destination: milestone.destination || 'Home',
      homeWorthyWhen: milestone.homeWorthyWhen || 'the scheduled milestone is reached',
      semanticSummary,
      previous: { phase: 'announced', opensAt: milestone.opensAt },
      current: { status: 200, title: milestone.label, textSample: semanticSummary, textHash: stableHash, linkHash: stableHash },
      linkDelta: { added: [], removed: [] },
    })
    nextReached[milestone.id] = { reachedAt: checkedAt, opensAt: milestone.opensAt }
  }
  return { changes, reached: nextReached }
}
