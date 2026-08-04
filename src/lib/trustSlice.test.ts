import { describe, expect, it } from 'vitest'
import { formatOccurrenceTime, readTrustSliceCache, TRUST_SLICE_CACHE_KEY, type TrustSlice } from './trustSlice'

const fixture = {
  ownerId: 'owner',
  source: { id: 'source', publisher_name: 'ReedPop', title: 'Black Lotus', canonical_url: 'https://example.com', access_state: 'available' },
  observation: { id: 'observation', source_id: 'source', retrieved_at: '2026-08-03T17:34:06Z', observation_status: 'published', exact_wording: 'Planechase Unknown', supports: 'Saturday occurrence' },
  occurrence: { id: 'occurrence', current_observation_id: 'observation', title: 'Black Lotus Planechase Unknown', occurrence_state: 'published', starts_at: '2026-11-14T16:30:00Z', ends_at: '2026-11-14T20:00:00Z', local_timezone: 'America/New_York', time_semantics: 'fixed', location_label: null, location_state: 'to_be_announced', access_label: 'Black Lotus VIP', preparation_note: 'Bring a Commander deck.' },
  decision: { id: 'decision', occurrence_id: 'occurrence', planning_state: 'interested', purchased: false, note: '', updated_at: '2026-08-03T17:34:06Z' },
  itinerary: { id: 'itinerary', decision_id: 'decision', occurrence_id: 'occurrence', starts_at: '2026-11-14T16:30:00Z', ends_at: '2026-11-14T20:00:00Z', time_semantics: 'fixed', active: true, updated_at: '2026-08-03T17:34:06Z' },
  savedAt: '2026-08-03T17:34:06Z',
} satisfies TrustSlice

describe('trust-slice offline read model', () => {
  it('reads a complete versioned cache and rejects malformed data', () => {
    const storage = { getItem: (key: string) => key === TRUST_SLICE_CACHE_KEY ? JSON.stringify(fixture) : null }
    expect(readTrustSliceCache(storage)?.occurrence.title).toBe('Black Lotus Planechase Unknown')
    expect(readTrustSliceCache({ getItem: () => '{bad' })).toBeNull()
  })

  it('formats the occurrence in its Atlanta timezone', () => {
    expect(formatOccurrenceTime(fixture)).toBe('Saturday, Nov 14 · 11:30 AM–3:00 PM')
  })
})
