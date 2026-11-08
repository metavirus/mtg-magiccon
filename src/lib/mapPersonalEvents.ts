import bindings from '../data/mapPlaceBindings.json'
import type { CatalogReadModel } from './catalog'
import programs from '../data/conventionPrograms.json'
import { ticketedPlayExploreEvents } from '../data/ticketedPlayExploreEvents'
import { scheduleStart } from './scheduleDisplay'
import type { TrustSlice } from './trustSlice'

export type MapEventInput = { id: string; title: string; day: string; time: string; state: string; purchased?: boolean; detail?: string; price: string }
export type MapPersonalEvent = { id: string; title: string; day: string; time: string; status: 'paid' | 'committed'; locationId: string | null; detail: string }
const locationIds: Record<string, string> = bindings.sourceLocationIds
const eventLocations = new Map(programs.sessions.map(session => [`program-${session.id}`, locationIds[session.location] ?? null]))
bindings.blackLotusLoungeEventIds.forEach(id => eventLocations.set(id, 'black-lotus'))

const locationNames = new Map(Object.entries(locationIds).map(([name, id]) => [id, name]))
locationNames.set('c101-showcase', 'Showcase Room · C101')
locationNames.set('c102-spindown', 'Spindown Room · C102')
locationNames.set('mana-stage', 'Mana Stage · Georgia Ballroom, Level 3')
locationNames.set('black-lotus', 'Black Lotus Lounge · Triumph Ballroom, Signia')
locationNames.set('world-championship', 'World Championship · Hall C')

export function reviewedEventLocation(eventId: string) {
  const id = eventLocations.get(eventId)
  const name = id ? locationNames.get(id) : undefined
  return id && name ? { id, name } : undefined
}

type GatheringGroundsDetails = { host: string; hostPlaceId?: string; meetingPoint?: { placeId: string; label: string } }
const gatheringGroundsDetails = new Map<string, GatheringGroundsDetails>()
function bindGatheringGrounds(eventIds: number[], details: GatheringGroundsDetails) {
  for (const id of eventIds) gatheringGroundsDetails.set(`program-${id}`, details)
}

// The published session description must explicitly name a meeting point.
// The official Gathering Grounds group roster establishes booth identity, not event placement.
bindGatheringGrounds([954448, 954449, 954450, 954451, 954452, 954453], {
  host: 'MelaninMagic', hostPlaceId: 'melanin-magic',
})
bindGatheringGrounds([954454, 954455, 954456, 954458], {
  host: 'Birds of Paradise', hostPlaceId: 'birds-of-paradise',
  meetingPoint: { placeId: 'birds-of-paradise', label: 'At the Birds of Paradise booth' },
})
bindGatheringGrounds([954457, 954459], { host: 'Birds of Paradise', hostPlaceId: 'birds-of-paradise' })
bindGatheringGrounds([954460, 954461, 954462], { host: 'Wizards Pride', hostPlaceId: 'wizards-pride' })
bindGatheringGrounds([954464, 954465], { host: 'Veterans the Gathering', hostPlaceId: 'veterans-the-gathering' })
bindGatheringGrounds([954466], { host: 'Disability and Accessibility Alliance', hostPlaceId: 'disability-and-accessibility-alliance' })
bindGatheringGrounds([955599, 955600], { host: 'Women of Wizards', hostPlaceId: 'women-of-wizardry' })
bindGatheringGrounds([959866], {
  host: 'Women+ in Magic',
  meetingPoint: { placeId: 'disability-and-accessibility-alliance', label: 'In front of the Disability and Accessibility Alliance booth' },
})

export function eventMapDestination(eventId: string) {
  const venue = reviewedEventLocation(eventId)
  if (!venue) return undefined
  const details = gatheringGroundsDetails.get(eventId)
  return { ...venue, ...details, targetId: details?.meetingPoint?.placeId ?? venue.id }
}

// Services can guide attendees without asserting where an event is held.
// https://mcatlanta.mtgfestivals.com/en-us/info/mobile-app.html
// https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges/black-lotus-vip-experience.html
const ticketedEventIds = new Set<string>(ticketedPlayExploreEvents.map(event => event.id))
// The Atlanta play guide lists these four league offerings at the pickup desk.
// https://mcatlanta.mtgfestivals.com/en-us/magic-play/your-guide-to-playing-magic-at-magiccon.html
const leaguePickupIds = new Set([
  'ticketed-944028', 'ticketed-944074', 'ticketed-944119', 'ticketed-944129',
  'ticketed-944088', 'ticketed-944089', 'ticketed-944090', 'ticketed-944091', 'ticketed-944092',
  'ticketed-944111',
])
const leaguePickup = { targetId: 'league-pickup', label: 'Show pickup on map' }
export const hasLeaguePickup = (eventId: string) => leaguePickupIds.has(eventId)
const wristbandEventIds = new Set(['program-954720', 'program-954724', 'program-954726', 'program-954731'])
const megaGameEventIds = new Set(['bl-mega-game-fri', 'bl-mega-game-sat', 'bl-mega-game-sun'])
const ticketedPlayHelp = { targetId: 'ticketed-play-hub', label: 'Ticketed Play help' }
const wristbandPickup = { targetId: 'wristband-distribution', label: 'Wristband pickup' }
const megaGameRegistration = { targetId: 'black-lotus', label: 'Lounge registration by 2 PM' }

export function eventMapWayfinding(eventId: string): Array<{ targetId: string; label: string }> {
  if (hasLeaguePickup(eventId)) return [leaguePickup, ticketedPlayHelp]
  if (ticketedEventIds.has(eventId)) return [ticketedPlayHelp]
  if (wristbandEventIds.has(eventId)) return [wristbandPickup]
  if (megaGameEventIds.has(eventId)) return [megaGameRegistration]
  return []
}

const secondaryMapDestinations = new Set([
  leaguePickup.targetId, ticketedPlayHelp.targetId, wristbandPickup.targetId, megaGameRegistration.targetId,
  ...Array.from(gatheringGroundsDetails.values()).flatMap(details => details.meetingPoint ? [details.meetingPoint.placeId] : []),
])

export function isEventMapDestination(placeId: string) {
  return locationNames.has(placeId) || secondaryMapDestinations.has(placeId)
}

export type MapRoomEvent = Pick<MapEventInput, 'id' | 'title' | 'day' | 'time'> & { meetingPoint?: string; venue?: string }

export function groupMapRoomEvents(events: readonly MapRoomEvent[]): Record<string, MapRoomEvent[]> {
  const rooms: Record<string, MapRoomEvent[]> = {}
  for (const { id, title, day, time } of events) {
    const location = eventMapDestination(id)
    if (!location) continue
    const event = { id, title, day, time, meetingPoint: location.meetingPoint?.label }
    const venueSchedule = rooms[location.id] ??= []
    venueSchedule.push(event)
    if (location.targetId !== location.id) (rooms[location.targetId] ??= []).push(event)
    if (location.hostPlaceId && location.hostPlaceId !== location.targetId) {
      const hostSchedule = rooms[location.hostPlaceId] ??= []
      hostSchedule.push({ ...event, venue: location.name })
    }
  }
  const days = ['Thu', 'Fri', 'Sat', 'Sun']
  for (const schedule of Object.values(rooms)) {
    schedule.sort((a, b) => days.indexOf(a.day) - days.indexOf(b.day) || scheduleStart(a.time) - scheduleStart(b.time))
  }
  return rooms
}

export type MapSelectionRow = { owner_id: string; object_id: string; selection_key: string; selection_value: string }
/** Saved owner choices only: seed defaults and companion choices are not commitments. */
export function projectMapOwnerEvents(events: MapEventInput[], rows: MapSelectionRow[], ownerId: string | undefined, trust?: TrustSlice | null): MapEventInput[] {
  if (!ownerId) return []
  const choices = new Map(rows.filter(row => row.owner_id === ownerId).map(row => [row.object_id + '::' + row.selection_key, row.selection_value]))
  return events.map(event => {
    const prefix = 'explore-' + event.id + '::'
    const selected = choices.get(prefix + 'state')
    const purchase = choices.get(prefix + 'purchased')
    const decision = event.id === 'bl-planechase' && trust?.ownerId === ownerId ? trust.decision : undefined
    return { ...event, state: selected ?? decision?.planning_state ?? 'none', purchased: purchase === undefined ? decision?.purchased === true : purchase === 'true' }
  })
}

/** Input is the current owner's existing hydrated projection, never shared participants. */
export function selectMapPersonalEvents(events: MapEventInput[]): MapPersonalEvent[] {
  return events.filter(event => event.state === 'committed' || event.purchased === true).map(event => ({
    id: event.id, title: event.title, day: event.day, time: event.time,
    status: event.purchased === true ? 'paid' : 'committed',
    locationId: reviewedEventLocation(event.id)?.id ?? null, detail: event.detail ?? '',
  }))
}
export function mapStudyMessage(event: Pick<MessageEvent, 'origin' | 'source' | 'data'>, source: Window | null | undefined, origin: string): 'ready' | null {
  if (!source || event.source !== source || event.origin !== origin) return null
  return event.data?.type === 'magiccon:map-study-ready' && event.data?.version === 1 ? 'ready' : null
}

export type MapProduct = { id: string; productId: string; locationId: string; name: string; price: string | null; limit: number | null; availability: string; image: string | null }
/** Public catalog fields only; owner interests, notes and purchase state never cross the frame. */
export function selectMapProducts(model?: CatalogReadModel): MapProduct[] | null {
  if (!model || model.status !== 'ready') return null
  const groups = new Map<string, CatalogReadModel['offers']>()
  for (const offer of model.offers) {
    if (offer.event_key !== 'magiccon_atlanta_2026' || offer.attributes?.local_review || !['show_store', 'black_lotus', 'prize_wall'].includes(offer.family)) continue
    const key = offer.family + ':' + offer.product_id
    groups.set(key, [...(groups.get(key) ?? []), offer])
  }
  return [...groups.values()].map(rows => {
    const first = rows[0], priced = rows.filter(row => row.price_amount !== null)
    const prices = [...new Set(priced.map(row => row.price_amount!))], currencies = new Set(priced.map(row => row.currency)), limits = new Set(rows.map(row => row.purchase_limit))
    const currency = priced[0]?.currency
    const money = (amount: number) => currency === 'USD' ? '$' + amount : amount + ' ' + currency
    const price = !priced.length || currencies.size !== 1 || !currency ? null : prices.length === 1 && priced.length === rows.length ? money(prices[0]) : 'From ' + money(Math.min(...prices))
    return { id: first.offer_id, productId: first.product_id, locationId: ({ show_store: 'show-store', black_lotus: 'black-lotus', prize_wall: 'prize-wall' })[first.family],
      name: first.product_name, price, limit: limits.size === 1 ? first.purchase_limit : null,
      availability: new Set(rows.map(row => row.availability)).size === 1 ? first.availability : 'unknown',
      image: first.presentationUrl?.startsWith('./merchandise/') ? '.' + first.presentationUrl : first.presentationUrl }
  })
}
