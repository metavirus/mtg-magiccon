import bindings from '../data/mapPlaceBindings.json'
import type { CatalogReadModel } from './catalog'
import programs from '../data/conventionPrograms.json'
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

export function reviewedEventLocation(eventId: string) {
  const id = eventLocations.get(eventId)
  const name = id ? locationNames.get(id) : undefined
  return id && name ? { id, name } : undefined
}

export type MapRoomEvent = Pick<MapEventInput, 'id' | 'title' | 'day' | 'time'>

export function groupMapRoomEvents(events: readonly MapRoomEvent[]): Record<string, MapRoomEvent[]> {
  const rooms: Record<string, MapRoomEvent[]> = {}
  for (const { id, title, day, time } of events) {
    const location = reviewedEventLocation(id)
    if (location) (rooms[location.id] ??= []).push({ id, title, day, time })
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
