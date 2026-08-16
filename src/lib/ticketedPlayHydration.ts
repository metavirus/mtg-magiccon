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

export type ParsedLeapTicketedPlayListing = {
  sourceTitle: string
  title: string
  sourceCategories: string[]
  exploreBucket: ExploreBucket
  kind: HydratedEventKind
  playFormat: PlayFormat | null
  difficulty: EventDifficulty | null
  timeKind: EventTimeKind
  availability: SourceAvailability
  priceAmount?: number
  priceCurrency?: 'USD'
  priceDisplay?: string
  purchaseRequired: boolean
  teamSize?: number
  requirements: TicketedPlayRequirement[]
  sections: Array<{ heading: string; body: string }>
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

export function parseLeapTicketedPlayListing(input: {
  rawTitle: string
  rawCategories?: string[]
  rawDescription?: string
}): ParsedLeapTicketedPlayListing {
  const sourceCategories = input.rawCategories ?? []
  const haystack = `${input.rawTitle} ${sourceCategories.join(' ')} ${input.rawDescription ?? ''}`.toLowerCase()
  const price = parseDollarPrice(input.rawTitle)
  const playFormat = inferPlayFormat(haystack)
  const kind: HydratedEventKind = haystack.includes('ticketed play') || playFormat ? 'ticketed_play' : 'unknown'

  return {
    sourceTitle: input.rawTitle,
    title: cleanLeapEventTitle(input.rawTitle),
    sourceCategories,
    exploreBucket: inferExploreBucket({ sourceCategories, title: input.rawTitle, playFormat, kind }),
    kind,
    playFormat,
    difficulty: inferDifficulty(sourceCategories),
    timeKind: inferTimeKind(haystack),
    availability: inferAvailability(input.rawTitle),
    ...(price ? { priceAmount: price.amount, priceCurrency: 'USD' as const, priceDisplay: price.display } : {}),
    purchaseRequired: Boolean(price),
    teamSize: inferTeamSize(haystack),
    requirements: inferRequirements(haystack, input.rawDescription),
    sections: parseSourceSections(input.rawDescription ?? ''),
  }
}

export function cleanLeapEventTitle(rawTitle: string): string {
  return rawTitle
    .replace(/^\s*SOLD\s+OUT\s*[-–—]\s*/i, '')
    .replace(/\s*\(click here for more info\)\s*$/i, '')
    .replace(/\s*[-–—]\s*\$\d+(?:\.\d{2})?\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDollarPrice(rawTitle: string) {
  const match = rawTitle.match(/\$(\d+(?:\.\d{2})?)/)
  if (!match) return null
  const amount = Number(match[1])
  if (!Number.isFinite(amount)) return null
  return { amount, display: `$${match[1]}` }
}

function inferAvailability(rawTitle: string): SourceAvailability {
  if (/^\s*SOLD\s+OUT\b/i.test(rawTitle)) return 'sold_out'
  if (/\bwaitlist\b/i.test(rawTitle)) return 'waitlist'
  return 'unknown'
}

function inferPlayFormat(haystack: string): PlayFormat | null {
  if (/\b(2hg|two[-\s]?headed)\b/.test(haystack)) return 'two_headed_giant'
  if (/\bcommander\b/.test(haystack)) return 'commander'
  if (/\bsealed\b/.test(haystack)) return 'sealed'
  if (/\bdraft\b/.test(haystack)) return 'draft'
  if (/\bleague\b/.test(haystack)) return 'league'
  if (/\bconstructed\b/.test(haystack)) return 'constructed'
  if (/\bcasual\b/.test(haystack)) return 'casual_play'
  return null
}

function inferDifficulty(sourceCategories: string[]): EventDifficulty | null {
  const categories = sourceCategories.map(category => category.toLowerCase())
  if (categories.includes('competitive')) return 'competitive'
  if (categories.includes('challenging')) return 'challenging'
  if (categories.includes('social')) return 'social'
  if (categories.includes('casual')) return 'casual'
  return null
}

function inferTimeKind(haystack: string): EventTimeKind {
  if (/\bleague\b/.test(haystack)) return 'league_window'
  if (/\b(drop[-\s]?in|come and go|any time|optional)\b/.test(haystack)) return 'drop_in'
  if (/\b(pickup|pick up|claim)\b/.test(haystack)) return 'pickup_window'
  return 'fixed_block'
}

function inferTeamSize(haystack: string) {
  if (/\b(2hg|two[-\s]?headed|two \(2\) players|two players)\b/.test(haystack)) return 2
  return undefined
}

function inferRequirements(haystack: string, sourceText?: string): TicketedPlayRequirement[] {
  const requirements: TicketedPlayRequirement[] = []
  const add = (key: TicketedPlayRequirement['key'], label: string) => requirements.push({ key, label, sourceText })
  if (/\b(2hg|two[-\s]?headed|two \(2\) players|two players)\b/.test(haystack)) add('team_event', 'Team event')
  if (/\bone entry pays for the full team\b/.test(haystack)) add('one_entry_covers_team', 'One entry covers team')
  if (/\bwizards account required\b/.test(haystack)) add('wizards_account_required', 'Wizards Account required')
  if (/\bcompanion app\b/.test(haystack)) add('companion_app_required', 'Companion App required')
  if (/\bnon[-\s]?refundable\b/.test(haystack)) add('nonrefundable', 'Nonrefundable')
  if (/\bregistration\b/.test(haystack)) add('registration_required', 'Registration required')
  return requirements
}

function parseSourceSections(rawDescription: string): Array<{ heading: string; body: string }> {
  const headingPattern = /^(IMPORTANT REGISTRATION DETAILS|PARTICIPATION DETAILS|TOURNAMENT DETAILS|PRIZES \(per player\)|TOURNAMENT QUESTIONS\?)$/gm
  const matches = [...rawDescription.matchAll(headingPattern)]
  if (matches.length === 0) return rawDescription.trim() ? [{ heading: 'Description', body: rawDescription.trim() }] : []

  return matches.map((match, index) => {
    const heading = match[1]
    const bodyStart = (match.index ?? 0) + heading.length
    const bodyEnd = index + 1 < matches.length ? matches[index + 1].index ?? rawDescription.length : rawDescription.length
    return { heading, body: rawDescription.slice(bodyStart, bodyEnd).trim() }
  })
}
