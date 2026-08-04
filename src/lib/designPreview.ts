import type { TrustSlice } from './trustSlice'

const ownerId = 'c930249d-01a9-468b-846c-2e5d0f6da233'
const previewObservation = {
  id: 'preview-observation',
  source_id: 'preview-source',
  retrieved_at: '2026-08-03T17:34:06.000Z',
  observation_status: 'published',
  exact_wording: '11:30 AM – 3:00 PM - WotC Casual Play Designers and members of the Commander Format Panel (CFP) present Planechase Unknown*. Commander Deck needed.',
  supports: 'Supports the dated Black Lotus occurrence and Commander-deck preparation clue.',
}

export const DESIGN_PREVIEW_SLICE: TrustSlice = {
  ownerId,
  source: {
    id: 'preview-source',
    publisher_name: 'ReedPop / MagicCon: Atlanta',
    title: 'MagicCon: Atlanta Black Lotus VIP',
    canonical_url: 'https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges/black-lotus-vip-experience.html',
    access_state: 'available',
  },
  observation: previewObservation,
  observationHistory: [previewObservation],
  occurrence: {
    id: 'preview-occurrence',
    current_observation_id: 'preview-observation',
    title: 'Black Lotus Planechase Unknown',
    occurrence_state: 'published',
    starts_at: '2026-11-14T16:30:00.000Z',
    ends_at: '2026-11-14T20:00:00.000Z',
    local_timezone: 'America/New_York',
    time_semantics: 'fixed',
    location_label: null,
    location_state: 'to_be_announced',
    access_label: 'Black Lotus VIP',
    preparation_note: 'Bring a Commander deck.',
  },
  decision: {
    id: 'preview-decision',
    occurrence_id: 'preview-occurrence',
    planning_state: 'interested',
    purchased: false,
    note: '',
    updated_at: '2026-08-03T17:34:06.000Z',
  },
  itinerary: {
    id: 'preview-itinerary',
    decision_id: 'preview-decision',
    occurrence_id: 'preview-occurrence',
    starts_at: '2026-11-14T16:30:00.000Z',
    ends_at: '2026-11-14T20:00:00.000Z',
    time_semantics: 'fixed',
    active: true,
    updated_at: '2026-08-03T17:34:06.000Z',
  },
  savedAt: '2026-08-03T17:34:06.000Z',
}
