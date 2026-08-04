export const TRUST_SLICE_CACHE_KEY = 'magiccon:black-lotus-trust-slice:v1'

export type PlanningState = 'none' | 'interested' | 'tentative' | 'committed'

export type TrustSlice = {
  ownerId: string
  source: {
    id: string
    publisher_name: string
    title: string
    canonical_url: string
    access_state: string
  }
  observation: {
    id: string
    source_id: string
    retrieved_at: string
    observation_status: string
    exact_wording: string
    supports: string
  }
  occurrence: {
    id: string
    current_observation_id: string
    title: string
    occurrence_state: string
    starts_at: string
    ends_at: string
    local_timezone: string
    time_semantics: string
    location_label: string | null
    location_state: string
    access_label: string | null
    preparation_note: string | null
  }
  decision: {
    id: string
    occurrence_id: string
    planning_state: PlanningState
    purchased: boolean
    note: string
    updated_at: string
  }
  itinerary: {
    id: string
    decision_id: string
    occurrence_id: string
    starts_at: string
    ends_at: string
    time_semantics: string
    active: boolean
    updated_at: string
  }
  savedAt: string
}

export function readTrustSliceCache(storage: Pick<Storage, 'getItem'> = localStorage): TrustSlice | null {
  try {
    const value = storage.getItem(TRUST_SLICE_CACHE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as TrustSlice
    if (!parsed.ownerId || !parsed.savedAt || !parsed.occurrence?.id || !parsed.observation?.id) return null
    return parsed
  } catch {
    return null
  }
}

export function writeTrustSliceCache(
  slice: TrustSlice,
  storage: Pick<Storage, 'setItem'> = localStorage,
) {
  storage.setItem(TRUST_SLICE_CACHE_KEY, JSON.stringify(slice))
}

export function formatOccurrenceTime(slice: TrustSlice) {
  const date = new Intl.DateTimeFormat('en-US', {
    timeZone: slice.occurrence.local_timezone,
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(new Date(slice.occurrence.starts_at))
  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: slice.occurrence.local_timezone,
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${date} · ${time.format(new Date(slice.occurrence.starts_at))}–${time.format(new Date(slice.occurrence.ends_at))}`
}
