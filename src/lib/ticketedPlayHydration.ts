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

export type TicketedPlayInventoryDiff = {
  added: HydratedTicketedPlayEvent[]
  removed: HydratedTicketedPlayEvent[]
  changed: Array<{
    previous: HydratedTicketedPlayEvent
    current: HydratedTicketedPlayEvent
    fields: Array<'availability' | 'time' | 'location' | 'price'>
  }>
  signals: TicketedPlaySignalGroup[]
}

export function blocksCalendar(event: Pick<HydratedTicketedPlayEvent, 'purchaseStatus' | 'timeKind'>): boolean {
  return (event.purchaseStatus === 'purchased' || event.purchaseStatus === 'registered') && event.timeKind === 'fixed_block'
}

export function diffTicketedPlayInventory(input: {
  previous: HydratedTicketedPlayEvent[]
  current: HydratedTicketedPlayEvent[]
  retrievedAt: string
}): TicketedPlayInventoryDiff {
  const previousByKey = new Map(input.previous.map(event => [event.sourceEventKey, event]))
  const currentByKey = new Map(input.current.map(event => [event.sourceEventKey, event]))
  const added = input.current.filter(event => !previousByKey.has(event.sourceEventKey))
  const removed = input.previous.filter(event => !currentByKey.has(event.sourceEventKey))
  const changed = input.current.flatMap(current => {
    const previous = previousByKey.get(current.sourceEventKey)
    if (!previous) return []
    const fields = changedFields(previous, current)
    return fields.length > 0 ? [{ previous, current, fields }] : []
  })
  const signals = [
    ...buildAddedSignals(added, input.retrievedAt),
    ...buildChangedSignals(changed, input.retrievedAt),
  ]

  return { added, removed, changed, signals }
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

function changedFields(
  previous: HydratedTicketedPlayEvent,
  current: HydratedTicketedPlayEvent,
): Array<'availability' | 'time' | 'location' | 'price'> {
  const fields: Array<'availability' | 'time' | 'location' | 'price'> = []
  if (previous.availability !== current.availability) fields.push('availability')
  if (
    previous.date !== current.date ||
    previous.startsAt !== current.startsAt ||
    previous.endsAt !== current.endsAt ||
    previous.durationMinutes !== current.durationMinutes ||
    previous.timeKind !== current.timeKind
  ) {
    fields.push('time')
  }
  if (previous.locationName !== current.locationName || previous.room !== current.room) fields.push('location')
  if (previous.priceAmount !== current.priceAmount || previous.priceDisplay !== current.priceDisplay) fields.push('price')
  return fields
}

function buildAddedSignals(events: HydratedTicketedPlayEvent[], retrievedAt: string): TicketedPlaySignalGroup[] {
  if (events.length === 0) return []
  const highSignalEvents = events.filter(isHighSignalEvent)
  const signals: TicketedPlaySignalGroup[] = [
    {
      id: signalId('ticketed-play-drop', retrievedAt, 'all'),
      kind: 'ticketed_play_drop',
      severity: events.length >= 5 ? 'worth_knowing' : 'activity',
      title: `${events.length} ticketed play ${events.length === 1 ? 'event landed' : 'events landed'}`,
      summary: 'New LEAP listings are ready to triage in Explore.',
      affectedEventIds: events.map(event => event.id),
      groupTags: ['ticketed-play', 'first-drop'],
      destinationRoute: 'explore',
      destinationFilter: { exploreBucket: 'play', group: 'all_ticketed_play' },
    },
  ]

  if (highSignalEvents.length > 0) {
    signals.unshift({
      id: signalId('ticketed-play-drop', retrievedAt, 'high-signal'),
      kind: 'ticketed_play_drop',
      severity: 'hot',
      title: `${highSignalEvents.length} high-signal ${highSignalEvents.length === 1 ? 'event' : 'events'} landed`,
      summary: 'These new listings look especially worth reviewing first.',
      affectedEventIds: highSignalEvents.map(event => event.id),
      groupTags: ['ticketed-play', 'high-signal'],
      destinationRoute: 'explore',
      destinationFilter: { exploreBucket: 'play', group: 'high_signal' },
    })
  }

  return signals
}

function buildChangedSignals(
  changed: TicketedPlayInventoryDiff['changed'],
  retrievedAt: string,
): TicketedPlaySignalGroup[] {
  const soldOut = changed
    .filter(change => change.fields.includes('availability') && change.current.availability === 'sold_out')
    .map(change => change.current)
  const timeChanged = changed.filter(change => change.fields.includes('time')).map(change => change.current)
  const locationChanged = changed.filter(change => change.fields.includes('location')).map(change => change.current)
  const priceChanged = changed.filter(change => change.fields.includes('price')).map(change => change.current)
  const signals: TicketedPlaySignalGroup[] = []

  if (soldOut.length > 0) {
    signals.push({
      id: signalId('ticketed-play-sold-out', retrievedAt, soldOut.map(event => event.sourceEventKey).join('-')),
      kind: 'availability_change',
      severity: 'worth_knowing',
      title: `${soldOut.length} watched ${soldOut.length === 1 ? 'event sold out' : 'events sold out'}`,
      summary: 'Sold-out events stay visible briefly so purchased or watched items can be reconciled.',
      affectedEventIds: soldOut.map(event => event.id),
      groupTags: ['ticketed-play', 'sold-out'],
      destinationRoute: 'explore',
      destinationFilter: { exploreBucket: 'play', availability: 'sold_out', group: 'sold_out' },
    })
  }

  if (timeChanged.length > 0) signals.push(changeSignal('time_change', 'time changed', timeChanged, retrievedAt))
  if (locationChanged.length > 0) signals.push(changeSignal('location_change', 'location changed', locationChanged, retrievedAt))
  if (priceChanged.length > 0) signals.push(changeSignal('price_change', 'price changed', priceChanged, retrievedAt))

  return signals
}

function changeSignal(
  kind: Extract<TicketedPlaySignalGroup['kind'], 'time_change' | 'location_change' | 'price_change'>,
  label: string,
  events: HydratedTicketedPlayEvent[],
  retrievedAt: string,
): TicketedPlaySignalGroup {
  return {
    id: signalId(`ticketed-play-${kind}`, retrievedAt, events.map(event => event.sourceEventKey).join('-')),
    kind,
    severity: 'worth_knowing',
    title: `${events.length} ticketed play ${events.length === 1 ? 'event' : 'events'} ${label}`,
    summary: 'Review the affected listings before turning them into plan or calendar commitments.',
    affectedEventIds: events.map(event => event.id),
    groupTags: ['ticketed-play', kind],
    destinationRoute: 'explore',
    destinationFilter: { exploreBucket: 'play', group: 'watched' },
  }
}

function isHighSignalEvent(event: HydratedTicketedPlayEvent): boolean {
  if (event.purchaseStatus === 'purchased' || event.purchaseStatus === 'registered') return true
  if (event.sourceCategories.some(category => category.toLowerCase() === 'black lotus')) return true
  if (event.relevanceReasons.length >= 2) return true
  if (event.difficulty === 'social' || event.difficulty === 'challenging') return true
  if (event.playFormat === 'commander' || event.playFormat === 'two_headed_giant') return true
  return false
}

function signalId(prefix: string, retrievedAt: string, scope: string): string {
  const stamp = retrievedAt.replace(/[^0-9TZ]/g, '').replace(/Z$/, 'z')
  const safeScope = scope.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'all'
  return `${prefix}-${stamp}-${safeScope}`
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
