import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { diffTicketedPlayInventory, normalizeLeapInventoryCards, routeTicketedPlaySoldOutTransitions, stabilizeTicketedPlayInventory } from './ticketed_play_inventory.mjs'

const sourceUrl = 'https://conventions.leapevent.tech/ed/schedule/htwhdatl26shdl10'
const soldOutCards = [
  ['Commander Sealed Draft with Commander at Home - Rochester draft your Sealed pool!- $180 (Click here for more info)', 'Friday November 13th', '11:30am - 3:25pm'],
  ['2HG - Full-Box Sealed - Mystery Booster Commander Edition - $320 (Click here for more info)', 'Friday November 13th', '4:30pm - 8:59pm'],
  ['Prismatic Pride Commander Sealed – Presented by Wizards Pride - $90 (Click here for more info)', 'Friday November 13th', '4:30pm - 8:29pm'],
  ['Grand Melee - Mega Sealed - Mystery Booster Commander Edition - $160 (Click here for more info)', 'Saturday November 14th', '11:00am - 3:55pm'],
  ['Team Trios - Collector Booster Sealed - Reality Fracture - $500 (Click here for more info)', 'Saturday November 14th', '12:00pm - 3:59pm'],
  ['2HG - Full-Box Sealed - Mystery Booster Commander Edition - $320 (Click here for more info)', 'Saturday November 14th', '2:00pm - 5:59pm'],
  ['Draft - Mystery Booster Commander Edition - $50 (Click here for more info)', 'Saturday November 14th', '2:00pm - 5:59pm'],
  ['Team Trios - Sealed - Reality Fracture - $120 (Click here for more info)', 'Saturday November 14th', '4:30pm - 8:25pm'],
  ['2HG - Full-Box Sealed - Mystery Booster Commander Edition - $320 (Click here for more info)', 'Saturday November 14th', '7:00pm - 10:55pm'],
  ['Team Trios - Full-Box Sealed - Reality Fracture - $165 (Click here for more info)', 'Sunday November 15th', '12:00pm - 3:55pm'],
].map(([title, day, time]) => ({ title, day, time, soldOut: true, controls: [] }))

describe('LEAP Ticketed Play inventory', () => {
  it('normalizes the current ten explicit sellouts into stable event records', () => {
    const events = normalizeLeapInventoryCards(soldOutCards, { sourceUrl, retrievedAt: '2026-08-25T20:00:00Z' })
    expect(events).toHaveLength(10)
    expect(new Set(events.map(event => event.sourceEventKey))).toHaveProperty('size', 10)
    expect(events.every(event => event.availability === 'sold_out')).toBe(true)
    expect(events[0]).toMatchObject({ title: 'Commander Sealed Draft with Commander at Home - Rochester draft your Sealed pool!', day: '2026-11-13', startsAt: '11:30', endsAt: '15:25' })
  })

  it('recognizes LEAP anonymous soldout cards by their missing registration control', () => {
    const [event] = normalizeLeapInventoryCards([{
      title: soldOutCards[0].title,
      day: soldOutCards[0].day,
      time: soldOutCards[0].time,
      soldOut: false,
      registrationControlMissing: true,
      controls: [],
    }], { sourceUrl })

    expect(event.availability).toBe('sold_out')
    expect(event.availabilityEvidence.kind).toBe('missing_registration_control')
  })

  it('maps live LEAP identities onto canonical Explore event IDs', () => {
    const snapshot = JSON.parse(fs.readFileSync('research/precanon/ticketed-play/snapshots/2026-08-18_ticketed-play-v1.raw.json', 'utf8'))
    const canonicalEvents = snapshot.events.map((event: any) => ({ ...event, id: `ticketed-${event.sourceEventKey}` }))
    const events = normalizeLeapInventoryCards(soldOutCards, { sourceUrl, canonicalEvents })
    expect(events).toHaveLength(10)
    expect(events.filter(event => !/^ticketed-\d+$/.test(event.id)).map(event => ({ id: event.id, title: event.title, day: event.day, startsAt: event.startsAt }))).toEqual([])
  })

  it('emits transitions only and stays quiet on a repeated inventory', () => {
    const soldOut = normalizeLeapInventoryCards(soldOutCards, { sourceUrl })
    const available = soldOut.map(event => ({ ...event, availability: 'available' }))
    expect(diffTicketedPlayInventory([], soldOut)).toHaveLength(10)
    expect(diffTicketedPlayInventory([], available)).toEqual([])
    expect(diffTicketedPlayInventory(available, soldOut)).toHaveLength(10)
    expect(diffTicketedPlayInventory(soldOut, soldOut)).toEqual([])
  })

  it('does not let an unknown observation reset a known state or reannounce the same sellout', () => {
    const [soldOut] = normalizeLeapInventoryCards(soldOutCards.slice(0, 1), { sourceUrl })
    const unknownObservation = {
      ...soldOut,
      availability: 'unknown',
      availabilityEvidence: { kind: 'purchase_control', controls: [{ text: 'Login to add to your schedule', disabled: true }] },
      retrievedAt: '2026-08-28T01:30:09.731Z',
    }
    const stabilizedUnknown = stabilizeTicketedPlayInventory([soldOut], [unknownObservation])
    expect(stabilizedUnknown[0]).toMatchObject({
      availability: 'sold_out',
      availabilityEvidence: soldOut.availabilityEvidence,
      retrievedAt: unknownObservation.retrievedAt,
    })
    expect(diffTicketedPlayInventory([soldOut], stabilizedUnknown)).toEqual([])

    const soldOutAgain = { ...soldOut, retrievedAt: '2026-08-28T17:24:54.702Z' }
    expect(diffTicketedPlayInventory(stabilizedUnknown, [soldOutAgain])).toEqual([])
  })

  it('still accepts a positive available or waitlist observation after a sellout', () => {
    const [soldOut] = normalizeLeapInventoryCards(soldOutCards.slice(0, 1), { sourceUrl })
    for (const availability of ['available', 'waitlist']) {
      const [stabilized] = stabilizeTicketedPlayInventory([soldOut], [{ ...soldOut, availability }])
      expect(stabilized.availability).toBe(availability)
      expect(diffTicketedPlayInventory([soldOut], [stabilized])).toMatchObject([{ previousAvailability: 'sold_out', availability }])
    }
  })

  it('groups ordinary sellouts into one Home signal', () => {
    const soldOut = normalizeLeapInventoryCards(soldOutCards, { sourceUrl })
    const transitions = diffTicketedPlayInventory(soldOut.map(event => ({ ...event, availability: 'available' })), soldOut)
    const rows = routeTicketedPlaySoldOutTransitions(transitions, { checkedAt: '2026-08-25T20:00:00Z' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ destination: 'Home', title: '10 Ticketed Play events are sold out' })
    expect(rows[0].evidence.events).toHaveLength(10)
  })

  it('adds one persistent bell Inbox alert when a companion selected an affected event', () => {
    const soldOut = normalizeLeapInventoryCards(soldOutCards.slice(0, 2), { sourceUrl })
    const chosen = soldOut[0]
    const transitions = diffTicketedPlayInventory(soldOut.map(event => ({ ...event, availability: 'available' })), soldOut)
    const rows = routeTicketedPlaySoldOutTransitions(transitions, {
      checkedAt: '2026-08-25T20:00:00Z',
      selectionRows: [
        { owner_id: 'kavi-id', object_id: `explore-${chosen.id}`, object_kind: 'event', selection_key: 'state', selection_value: 'interested' },
        { owner_id: 'chris-id', object_id: `explore-${chosen.id}`, object_kind: 'event', selection_key: 'purchase_locked', selection_value: 'true' },
      ],
      companions: [
        { user_id: 'kavi-id', display_name: 'Kavi' },
        { user_id: 'chris-id', display_name: 'Chris' },
      ],
    })
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({ destination: 'Inbox', status: 'unread' })
    expect(rows[1].evidence).toMatchObject({ persistent_inbox: true, bell: true })
    expect(rows[1].summary).toContain('Chris, Kavi')
    expect(routeTicketedPlaySoldOutTransitions(diffTicketedPlayInventory(soldOut, soldOut), { selectionRows: [] })).toEqual([])
  })

  it('routes a configured reopening to one persistent Inbox bell and email intent', () => {
    const event = { id: 'ticketed-944127', sourceEventKey: '944127', sourceUrl, title: 'Magic: The Menu - Brunch - with Numot the Nummy', day: '2026-11-15', startsAt: '11:30', endsAt: '16:25', availabilityEvidence: { kind: 'purchase_control' } }
    const watch = { sourceEventKey: '944127', notifyPersonKey: 'kavi', registrationUrl: `${sourceUrl}?op=59962344#`, emailAlert: true }
    const rows = routeTicketedPlaySoldOutTransitions([{ eventId: event.id, sourceEventKey: event.sourceEventKey, previousAvailability: 'sold_out', availability: 'available', event: { ...event, availability: 'available' } }], { checkedAt: '2026-08-26T20:00:00Z', availabilityWatches: [watch] })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ destination: 'Inbox', status: 'unread', title: `${event.title} is available again` })
    expect(rows[0].evidence).toMatchObject({ persistent_inbox: true, bell: true, email_alert: true, notify_person_key: 'kavi' })
  })

  it('does not treat unknown or an unrelated reopening as alertable', () => {
    const event = { id: 'ticketed-944127', sourceEventKey: '944127', sourceUrl, title: 'Magic: The Menu', availabilityEvidence: {} }
    const watch = { sourceEventKey: '944127', emailAlert: true }
    const transition = availability => [{ eventId: event.id, sourceEventKey: event.sourceEventKey, previousAvailability: 'sold_out', availability, event: { ...event, availability } }]
    expect(routeTicketedPlaySoldOutTransitions(transition('unknown'), { availabilityWatches: [watch] })).toEqual([])
    expect(routeTicketedPlaySoldOutTransitions(transition('available'), { availabilityWatches: [{ sourceEventKey: 'other', emailAlert: true }] })).toEqual([])
  })

  it('surfaces a watched potential opening when explicit SOLD OUT text disappears', () => {
    const before = [{ id: 'ticketed-944127', sourceEventKey: '944127', title: 'Magic: The Menu', availability: 'sold_out', availabilityEvidence: { kind: 'explicit_text' } }]
    const after = [{ ...before[0], availabilityEvidence: { kind: 'missing_registration_control' } }]
    const transitions = diffTicketedPlayInventory(before, after)
    expect(transitions).toMatchObject([{ availability: 'potential_opening', previousAvailability: 'sold_out' }])
    const rows = routeTicketedPlaySoldOutTransitions(transitions, { availabilityWatches: [{ sourceEventKey: '944127', emailAlert: true }] })
    expect(rows[0]).toMatchObject({ destination: 'Inbox', title: 'Magic: The Menu may be opening' })
  })
})
