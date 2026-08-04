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
  observationHistory?: Array<TrustSlice['observation']>
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

export type TrustSliceRevision = {
  observation: TrustSlice['observation'] & {
    supersedes_observation_id: string
  }
  occurrence: Partial<Pick<TrustSlice['occurrence'],
    'title' | 'occurrence_state' | 'starts_at' | 'ends_at' | 'time_semantics' |
    'location_label' | 'location_state' | 'access_label' | 'preparation_note'>>
}

export type ReconciledTrustSlice = {
  previousObservation: TrustSlice['observation']
  current: TrustSlice
  changedOccurrenceFields: (keyof TrustSliceRevision['occurrence'])[]
}

export function reconcileTrustSliceRevision(
  current: TrustSlice,
  revision: TrustSliceRevision,
  savedAt = new Date().toISOString(),
): ReconciledTrustSlice {
  if (revision.observation.source_id !== current.source.id) {
    throw new Error('A revision must belong to the same source.')
  }
  if (revision.observation.supersedes_observation_id !== current.observation.id) {
    throw new Error('A revision must explicitly supersede the current observation.')
  }
  if (revision.observation.id === current.observation.id) {
    throw new Error('A revision must be retained as a new observation.')
  }

  const changedOccurrenceFields = Object.entries(revision.occurrence)
    .filter(([key, value]) => current.occurrence[key as keyof TrustSlice['occurrence']] !== value)
    .map(([key]) => key as keyof TrustSliceRevision['occurrence'])

  return {
    previousObservation: current.observation,
    changedOccurrenceFields,
    current: {
      ...current,
      observation: revision.observation,
      observationHistory: [
        revision.observation,
        ...(current.observationHistory ?? [current.observation])
          .filter(observation => observation.id !== revision.observation.id),
      ],
      occurrence: {
        ...current.occurrence,
        ...revision.occurrence,
        current_observation_id: revision.observation.id,
      },
      // Personal state and itinerary remain unchanged until the owner reviews
      // the publisher revision and chooses its planning consequence.
      decision: current.decision,
      itinerary: current.itinerary,
      savedAt,
    },
  }
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
