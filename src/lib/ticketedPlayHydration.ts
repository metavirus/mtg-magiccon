export type ExploreBucket = 'play' | 'info' | 'social' | 'other'

export type HydratedEventKind =
  | 'ticketed_play'
  | 'panel'
  | 'meet_greet'
  | 'reception'
  | 'pickup'
  | 'store'
  | 'logistics'
  | 'unknown'

export type PlayFormat =
  | 'sealed'
  | 'draft'
  | 'commander'
  | 'two_headed_giant'
  | 'league'
  | 'constructed'
  | 'casual_play'
  | 'unknown'

export type EventDifficulty = 'casual' | 'social' | 'challenging' | 'competitive' | 'unknown'

export type EventTimeKind =
  | 'fixed_block'
  | 'optional_window'
  | 'league_window'
  | 'drop_in'
  | 'pickup_window'
  | 'all_day'
  | 'unknown'

export type SourceAvailability = 'available' | 'sold_out' | 'waitlist' | 'unavailable' | 'unknown'

export type PurchaseStatus = 'none' | 'purchased' | 'registered' | 'refunded' | 'transferred' | 'unknown'

export type PurchaseProofSource = 'receipt' | 'leap_order' | 'my_schedule' | 'manual_verified'

export type TicketedPlayRequirement = {
  key:
    | 'team_event'
    | 'one_entry_covers_team'
    | 'each_player_registers'
    | 'wizards_account_required'
    | 'companion_app_required'
    | 'nonrefundable'
    | 'registration_required'
  label: string
  sourceText?: string
}

export type LeapScheduleObservation = {
  sourceId: 'leap-atlanta-2026-ticketed-play' | string
  sourceUrl: string
  retrievedAt: string
  sourceEventKey: string
  rawTitle: string
  rawDescription?: string
  rawCategories: string[]
  rawDateLabel?: string
  rawTimeLabel?: string
  rawLocation?: string
  rawPrice?: string
  rawAvailability?: string
  rawPayload?: Record<string, unknown>
}

export type HydratedTicketedPlayEvent = {
  id: string
  sourceEventKey: string
  sourceUrl: string
  firstSeenAt: string
  lastSeenAt: string
  lastChangedAt?: string
  sourceTitle: string
  title: string
  sourceCategories: string[]
  exploreBucket: ExploreBucket
  kind: HydratedEventKind
  playFormat: PlayFormat | null
  difficulty: EventDifficulty | null
  timeKind: EventTimeKind
  availability: SourceAvailability
  availabilityChangedAt?: string
  soldOutFirstSeenAt?: string
  date?: string
  dayLabel?: string
  startsAt?: string
  endsAt?: string
  durationMinutes?: number
  locationName?: string
  room?: string
  priceAmount?: number
  priceCurrency?: 'USD'
  priceDisplay?: string
  purchaseRequired: boolean
  purchaseStatus: PurchaseStatus
  purchaseProofSource?: PurchaseProofSource
  purchaseProofObjectId?: string
  teamSize?: number
  requirements: TicketedPlayRequirement[]
  summary?: string
  sections: Array<{ heading: string; body: string }>
  planEffect?: string
  relevanceReasons: string[]
}

export type TicketedPlaySignalGroup = {
  id: string
  kind:
    | 'ticketed_play_drop'
    | 'availability_change'
    | 'time_change'
    | 'location_change'
    | 'price_change'
    | 'purchase_proof'
  severity: 'activity' | 'worth_knowing' | 'hot'
  title: string
  summary: string
  affectedEventIds: string[]
  groupTags: string[]
  destinationRoute: 'explore' | 'plan' | 'calendar' | 'wallet' | 'activity'
  destinationFilter?: {
    exploreBucket?: ExploreBucket
    availability?: SourceAvailability
    group?: 'high_signal' | 'sold_out' | 'watched' | 'social_fit' | 'conflicts' | 'all_ticketed_play'
  }
}

export function blocksCalendar(event: Pick<HydratedTicketedPlayEvent, 'purchaseStatus' | 'timeKind'>): boolean {
  return (event.purchaseStatus === 'purchased' || event.purchaseStatus === 'registered') && event.timeKind === 'fixed_block'
}

export function shouldKeepSoldOutVisible(event: Pick<HydratedTicketedPlayEvent, 'availability' | 'purchaseStatus' | 'soldOutFirstSeenAt'>, now = new Date()): boolean {
  if (event.availability !== 'sold_out') return true
  if (event.purchaseStatus === 'purchased' || event.purchaseStatus === 'registered') return true
  if (!event.soldOutFirstSeenAt) return true
  const soldOutAgeMs = now.getTime() - new Date(event.soldOutFirstSeenAt).getTime()
  return soldOutAgeMs < 7 * 24 * 60 * 60 * 1000
}

export function inferExploreBucket(input: { sourceCategories: string[]; title: string; playFormat?: PlayFormat | null; kind?: HydratedEventKind }): ExploreBucket {
  const haystack = `${input.title} ${input.sourceCategories.join(' ')}`.toLowerCase()
  if (input.kind === 'ticketed_play' || input.playFormat) return 'play'
  if (/\b(play|sealed|draft|commander|2hg|two-headed|league|tournament|constructed)\b/.test(haystack)) return 'play'
  if (/\b(panel|seminar|preview|announcement|learn|info)\b/.test(haystack)) return 'info'
  if (/\b(reception|party|mixer|meet\s*&\s*greet|meet and greet|social)\b/.test(haystack)) return 'social'
  return 'other'
}
