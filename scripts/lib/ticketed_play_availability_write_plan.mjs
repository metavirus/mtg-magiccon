/** A quiet observation remains in the cloud survey report. The canonical
 * table needs a write only for a missing row or a changed availability/key. */
export function planTicketedPlayAvailabilityWrites(projection = [], existing = []) {
  const byId = new Map(existing.map(row => [String(row.event_id), row]))
  return projection.filter(row => {
    const old = byId.get(String(row.event_id))
    return !old || old.availability !== row.availability || String(old.source_event_key) !== row.source_event_key
  })
}

export function verifyTicketedPlayAvailabilityWrites(expected = [], returned = []) {
  const byId = new Map(returned.map(row => [String(row.event_id), row]))
  for (const row of expected) {
    const actual = byId.get(row.event_id)
    if (!actual || actual.availability !== row.availability || String(actual.source_event_key) !== row.source_event_key || !Number.isFinite(Date.parse(actual.observed_at)) || Date.parse(actual.observed_at) !== Date.parse(row.observed_at)) {
      throw new Error(`Ticketed Play availability write/readback mismatch: ${row.event_id}`)
    }
  }
  return returned
}
