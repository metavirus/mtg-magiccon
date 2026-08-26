export type TicketedPlayAvailabilityProjectionRow = {
  event_id: string
  source_event_key: string
  availability: 'available' | 'sold_out' | 'waitlist' | 'unavailable' | 'unknown'
  observed_at: string
}

type ExploreAvailability = 'open' | 'sold-out' | 'changed'

function projectAvailability(value: TicketedPlayAvailabilityProjectionRow['availability']): ExploreAvailability | null {
  if (value === 'available') return 'open'
  if (value === 'sold_out') return 'sold-out'
  if (value === 'waitlist' || value === 'unavailable') return 'changed'
  return null
}

/** Exact canonical IDs are the only join. Titles are intentionally ignored. */
export function applyTicketedPlayAvailabilityProjection<T extends { id: string; availability: ExploreAvailability }>(
  events: T[],
  rows: TicketedPlayAvailabilityProjectionRow[],
): T[] {
  const currentByEventId = new Map(rows.map(row => [row.event_id, row]))
  return events.map(event => {
    const current = currentByEventId.get(event.id)
    const projected = current ? projectAvailability(current.availability) : null
    return projected ? { ...event, availability: projected } : event
  })
}

export function partitionExploreAvailability<T extends { availability: ExploreAvailability }>(events: T[]) {
  const active: T[] = []
  const soldOut: T[] = []
  for (const event of events) (event.availability === 'sold-out' ? soldOut : active).push(event)
  return { active, soldOut }
}

export function ticketedPurchasePresentation(event: { availability: ExploreAvailability; purchased?: boolean }) {
  if (event.availability === 'sold-out' && !event.purchased) return 'sold_out' as const
  if (event.purchased) return 'purchased' as const
  return 'available' as const
}
