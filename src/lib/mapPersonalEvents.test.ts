import { buildAtlantaMerchReview } from './atlantaMerchReview'
import { describe, expect, it } from 'vitest'
import programs from '../data/conventionPrograms.json'
import { selectMapPersonalEvents, selectMapProducts, mapStudyMessage, projectMapOwnerEvents, type MapEventInput } from './mapPersonalEvents'

const base: MapEventInput = { id: 'unknown', title: 'Showcase Room', day: 'Fri', time: '1 PM', price: '$100', state: 'none' }
describe('personal map projection', () => {
  it('includes only committed or actually purchased events, never price as purchase proof', () => {
    expect(selectMapPersonalEvents(['none', 'interested', 'tentative', 'hidden'].map(state => ({ ...base, state })))).toEqual([])
    expect(selectMapPersonalEvents([{ ...base, state: 'committed' }, { ...base, purchased: true }]).map(e => e.status)).toEqual(['committed', 'paid'])
  })
  it('binds exact maintained session identity and source location, never title guesses', () => {
    const session = programs.sessions.find(s => s.location === 'Showcase Room')!
    expect(selectMapPersonalEvents([{ ...base, id: 'program-' + session.id, state: 'committed' }])[0].locationId).toBe('c101-showcase')
    expect(selectMapPersonalEvents([{ ...base, state: 'committed' }])[0].locationId).toBeNull()
    const grounds = programs.sessions.find(s => s.location === 'The Gathering Grounds')!
    expect(selectMapPersonalEvents([{ ...base, id: 'program-' + grounds.id, purchased: true }])[0].locationId).toBe('gathering-grounds')
    expect(selectMapPersonalEvents([{ ...base, id: 'ticketed-944011', purchased: true }])[0].locationId).toBeNull()
  })
  it('accepts frame readiness only from exact frame and origin', () => {
    const message = { source: window, origin: 'https://same.test', data: { type: 'magiccon:map-study-ready', version: 1 } }
    expect(mapStudyMessage(message, window, message.origin)).toBe('ready')
    expect(mapStudyMessage(message, null, message.origin)).toBeNull()
    expect(mapStudyMessage({ ...message, source: null }, window, message.origin)).toBeNull()
    expect(mapStudyMessage({ ...message, origin: 'https://other.test' }, window, message.origin)).toBeNull()
    expect(mapStudyMessage({ ...message, data: { type: 'navigate' } }, window, message.origin)).toBeNull()
  })
})

describe('map product projection', () => {
  it('uses only current Atlanta catalog identities and public fields, grouped across variants', () => {
    const review = buildAtlantaMerchReview({ individualVariants: true })
    expect(selectMapProducts(review)).toEqual([])
    const rows = review.offers.filter(offer => offer.family === 'show_store').slice(0, 2).map(offer => ({ ...offer, attributes: null, interests: [{ ownerId: 'private-owner', note: 'private-note' }] }))
    const products = selectMapProducts({ status: 'ready', offers: rows as unknown as typeof review.offers })!
    expect(products).toHaveLength(1)
    expect(products[0]).toMatchObject({ locationId: 'show-store', productId: rows[0].product_id, id: rows[0].offer_id })
    expect(JSON.stringify(products)).not.toContain('private-')
    expect(selectMapProducts({ status: 'unavailable', offers: [] })).toBeNull()
    expect(selectMapProducts({ status: 'ready', offers: rows.map(offer => ({ ...offer, event_key: 'other-event' })) as unknown as typeof review.offers })).toEqual([])
  })
})

it('does not imply unknown variants share a price or limit', () => {
  const source = buildAtlantaMerchReview({ individualVariants: true }).offers[0]
  const rows = [{ ...source, attributes: null, price_amount: 10, currency: 'USD', purchase_limit: 2 }, { ...source, attributes: null, price_amount: null, currency: 'USD', purchase_limit: 3 }]
  expect(selectMapProducts({ status: 'ready', offers: rows })![0]).toMatchObject({ price: 'From $10', limit: null })
  expect(selectMapProducts({ status: 'ready', offers: rows.map(row => ({ ...row, currency: 'EUR', price_amount: 10 })) })![0].price).toBe('10 EUR')
  expect(selectMapProducts({ status: 'ready', offers: [{ ...rows[0], currency: 'USD' }, { ...rows[1], currency: 'EUR', price_amount: 12 }] })![0].price).toBeNull()
})


describe('saved owner map choices', () => {
  const row = (owner_id: string, selection_key: string, selection_value: string) => ({ owner_id, object_id: 'explore-unknown', selection_key, selection_value })
  it('ignores seed commitments, seed purchases, and another owner choices', () => {
    expect(selectMapPersonalEvents(projectMapOwnerEvents([{ ...base, state: 'committed', purchased: true }], [row('other', 'state', 'committed')], 'mine'))).toEqual([])
    expect(projectMapOwnerEvents([base], [], undefined)).toEqual([])
  })
  it('honors saved purchased true independently of the listed price and saved state', () => {
    const input = projectMapOwnerEvents([{ ...base, price: 'Free' }], [row('mine', 'purchased', 'true'), row('mine', 'state', 'none')], 'mine')
    expect(selectMapPersonalEvents(input)[0]).toMatchObject({ id: 'unknown', status: 'paid', locationId: null })
    expect(selectMapPersonalEvents(projectMapOwnerEvents([base], [row('mine', 'state', 'committed')], 'mine'))[0].status).toBe('committed')
  })
  it('uses only the matching owner trust decision with explicit choices taking precedence', () => {
    const trust = { ownerId: 'mine', decision: { planning_state: 'committed', purchased: true } } as Parameters<typeof projectMapOwnerEvents>[3]
    const event = { ...base, id: 'bl-planechase' }
    expect(selectMapPersonalEvents(projectMapOwnerEvents([event], [], 'mine', trust))[0].status).toBe('paid')
    expect(selectMapPersonalEvents(projectMapOwnerEvents([event], [], 'other', trust))).toEqual([])
    const rows = [{ ...row('mine', 'state', 'none'), object_id: 'explore-bl-planechase' }, { ...row('mine', 'purchased', 'false'), object_id: 'explore-bl-planechase' }]
    expect(selectMapPersonalEvents(projectMapOwnerEvents([event], rows, 'mine', trust))).toEqual([])
  })
})
