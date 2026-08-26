const ALLOWED_AVAILABILITY = new Set(['available', 'sold_out', 'waitlist', 'unavailable', 'unknown'])

/** Server staging projection. Deliberately drops titles, evidence, and people. */
export function ticketedPlayAvailabilityProjectionRows(inventory = []) {
  return inventory.map(event => ({
    event_id: String(event.id),
    source_event_key: String(event.sourceEventKey),
    availability: ALLOWED_AVAILABILITY.has(event.availability) ? event.availability : 'unknown',
    observed_at: event.retrievedAt,
  })).filter(row => /^ticketed-\d+$/.test(row.event_id) && /^\d+$/.test(row.source_event_key) && row.observed_at)
}
