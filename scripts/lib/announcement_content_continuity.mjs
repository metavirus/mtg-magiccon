// Exact evidence continuity only: never merge titles or fuzzy semantic claims.
export function planAnnouncementContentContinuity(rows) {
  const groups = new Map()
  for (const row of rows) {
    const current = row.evidence?.current
    if (row.destination !== 'Home' || row.evidence?.home_signal_kind !== 'interesting_announcement' || !row.source_id || !current?.contentHash) continue
    const key = JSON.stringify([row.source_id, current.contentHash, current.artistDirectory?.rosterHash ?? null, current.gatheringGrounds?.scheduleHash ?? null])
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  const writes = []
  for (const group of groups.values()) {
    if (group.length < 2) continue
    group.sort((a, b) => String(a.first_seen_at).localeCompare(String(b.first_seen_at)) || String(a.id).localeCompare(String(b.id)))
    const keeper = group[0]
    const choices = group.filter(row => !row.evidence?.announcement_superseded_by).map(row => row.status)
    const status = choices.includes('archived') ? 'archived' : choices.includes('read') ? 'read' : keeper.status
    if (keeper.status !== status) writes.push({ id: keeper.id, status, evidence: keeper.evidence })
    for (const duplicate of group.slice(1)) {
      if (duplicate.status === 'archived' && duplicate.evidence?.announcement_superseded_by === keeper.id) continue
      writes.push({ id: duplicate.id, status: 'archived', evidence: { ...duplicate.evidence, announcement_superseded_by: keeper.id } })
    }
  }
  return writes
}
