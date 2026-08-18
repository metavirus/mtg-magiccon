import { describe, expect, it } from 'vitest'
import {
  blocksCalendar,
  diffTicketedPlayInventory,
  type HydratedTicketedPlayEvent,
  parseLeapTicketedPlayListing,
  shouldKeepSoldOutVisible,
} from './ticketedPlayHydration'

const collectorBoosterDescription = `One entry pays for the full team! 2HG events require two (2) players per team. All players should bring a teammate or find a teammates. Players must have all members of their team present to play.

Open the coolest cards in the whole of Strixhaven with six Collector Boosters full of Rare cards, shiny foil cards, and special alt-art, alt-frame cards, build a deck, and battle it out!

IMPORTANT REGISTRATION DETAILS
Please read carefully. You must complete the registration process to play.

PARTICIPATION DETAILS
- Wizards Account required - https://myaccounts.wizards.com
- After purchasing your event entry, update your event information to include your Wizards Account email address.
Companion App used - https://magic.wizards.com/products/companion-app

TOURNAMENT DETAILS
- Sealed Tournament: No supplies/cards needed to participate. Basic lands will be provided.
- Product: 12x Secrets of Strixhaven Collector Boosters
- Rounds: Three (3) Best-of-One rounds. 50 minutes per round.
- Estimated length of deck building and play: 4 to 5 hours

PRIZES (per player)
- Win: 1,200 Prize Tix
- Loss: 400 Prize Tix

TOURNAMENT QUESTIONS?
Contact Pastimes Events on their Discord server.

All tournament add-ons are non-refundable and non-transferable.`

describe('ticketed play hydration', () => {
  it('normalizes a representative LEAP ticketed-play listing without trusting source title noise', () => {
    const parsed = parseLeapTicketedPlayListing({
      rawTitle: 'SOLD OUT - 2HG - Collector Booster Sealed - Secrets of Strixhaven - $360 (Click here for more info)',
      rawCategories: ['Challenging', 'Social', 'Ticketed Play'],
      rawDescription: collectorBoosterDescription,
    })

    expect(parsed).toMatchObject({
      sourceTitle: 'SOLD OUT - 2HG - Collector Booster Sealed - Secrets of Strixhaven - $360 (Click here for more info)',
      title: '2HG - Collector Booster Sealed - Secrets of Strixhaven',
      sourceCategories: ['Challenging', 'Social', 'Ticketed Play'],
      exploreBucket: 'play',
      kind: 'ticketed_play',
      playFormat: 'two_headed_giant',
      difficulty: 'challenging',
      timeKind: 'fixed_block',
      availability: 'sold_out',
      priceAmount: 360,
      priceCurrency: 'USD',
      priceDisplay: '$360',
      purchaseRequired: true,
      teamSize: 2,
    })
    expect(parsed.requirements.map(requirement => requirement.key)).toEqual(expect.arrayContaining([
      'team_event',
      'one_entry_covers_team',
      'wizards_account_required',
      'companion_app_required',
      'registration_required',
      'nonrefundable',
    ]))
    expect(parsed.sections.map(section => section.heading)).toEqual([
      'IMPORTANT REGISTRATION DETAILS',
      'PARTICIPATION DETAILS',
      'TOURNAMENT DETAILS',
      'PRIZES (per player)',
      'TOURNAMENT QUESTIONS?',
    ])
  })

  it('treats purchased fixed events as calendar blocks but league/window purchases as flexible', () => {
    expect(blocksCalendar({ purchaseStatus: 'purchased', timeKind: 'fixed_block' })).toBe(true)
    expect(blocksCalendar({ purchaseStatus: 'purchased', timeKind: 'league_window' })).toBe(false)
    expect(blocksCalendar({ purchaseStatus: 'none', timeKind: 'fixed_block' })).toBe(false)
  })

  it('keeps newly sold-out events visible for about a week unless proof already purchased them', () => {
    const now = new Date('2026-08-16T12:00:00Z')
    expect(shouldKeepSoldOutVisible({ availability: 'sold_out', purchaseStatus: 'none', soldOutFirstSeenAt: '2026-08-15T12:00:00Z' }, now)).toBe(true)
    expect(shouldKeepSoldOutVisible({ availability: 'sold_out', purchaseStatus: 'none', soldOutFirstSeenAt: '2026-08-01T12:00:00Z' }, now)).toBe(false)
    expect(shouldKeepSoldOutVisible({ availability: 'sold_out', purchaseStatus: 'purchased', soldOutFirstSeenAt: '2026-08-01T12:00:00Z' }, now)).toBe(true)
  })

  it('groups a first LEAP drop without flooding Home with one signal per event', () => {
    const current = [
      eventFixture({ id: 'event-1', sourceEventKey: 'event-1', title: 'Commander and Cocktails', playFormat: 'commander', difficulty: 'social' }),
      eventFixture({ id: 'event-2', sourceEventKey: 'event-2', title: 'Collector Booster Sealed', playFormat: 'sealed', difficulty: 'challenging' }),
      eventFixture({ id: 'event-3', sourceEventKey: 'event-3', title: 'Unknown Draft', playFormat: 'draft' }),
      eventFixture({ id: 'event-4', sourceEventKey: 'event-4', title: 'Competitive Modern', playFormat: 'constructed', difficulty: 'competitive' }),
      eventFixture({ id: 'event-5', sourceEventKey: 'event-5', title: 'Magic Meetup', playFormat: 'casual_play', difficulty: 'social' }),
    ]

    const diff = diffTicketedPlayInventory({ previous: [], current, retrievedAt: '2026-08-18T15:00:00Z' })

    expect(diff.added).toHaveLength(5)
    expect(diff.signals).toHaveLength(2)
    expect(diff.signals[0]).toMatchObject({
      kind: 'ticketed_play_drop',
      severity: 'hot',
      title: '3 high-signal events landed',
      affectedEventIds: ['event-1', 'event-2', 'event-5'],
      destinationRoute: 'explore',
      destinationFilter: { exploreBucket: 'play', group: 'high_signal' },
    })
    expect(diff.signals[1]).toMatchObject({
      kind: 'ticketed_play_drop',
      severity: 'worth_knowing',
      title: '5 ticketed play events landed',
      destinationFilter: { exploreBucket: 'play', group: 'all_ticketed_play' },
    })
  })

  it('turns sold-out transitions into a targeted Explore signal', () => {
    const previous = [
      eventFixture({ id: 'sealed', sourceEventKey: 'sealed', title: 'Collector Booster Sealed', availability: 'available' }),
      eventFixture({ id: 'league', sourceEventKey: 'league', title: 'Commander League', playFormat: 'league', availability: 'available' }),
    ]
    const current = [
      eventFixture({ id: 'sealed', sourceEventKey: 'sealed', title: 'Collector Booster Sealed', availability: 'sold_out' }),
      eventFixture({ id: 'league', sourceEventKey: 'league', title: 'Commander League', playFormat: 'league', availability: 'available' }),
    ]

    const diff = diffTicketedPlayInventory({ previous, current, retrievedAt: '2026-08-18T16:00:00Z' })

    expect(diff.changed).toEqual([
      expect.objectContaining({
        current: expect.objectContaining({ id: 'sealed' }),
        fields: ['availability'],
      }),
    ])
    expect(diff.signals).toEqual([
      expect.objectContaining({
        kind: 'availability_change',
        severity: 'worth_knowing',
        title: '1 watched event sold out',
        affectedEventIds: ['sealed'],
        destinationFilter: { exploreBucket: 'play', availability: 'sold_out', group: 'sold_out' },
      }),
    ])
  })
})

function eventFixture(overrides: Partial<HydratedTicketedPlayEvent>): HydratedTicketedPlayEvent {
  return {
    id: 'event',
    sourceEventKey: 'event',
    sourceUrl: 'https://conventions.leapevent.tech/example',
    firstSeenAt: '2026-08-18T12:00:00Z',
    lastSeenAt: '2026-08-18T12:00:00Z',
    sourceTitle: 'Ticketed Play Event',
    title: 'Ticketed Play Event',
    sourceCategories: ['Ticketed Play'],
    exploreBucket: 'play',
    kind: 'ticketed_play',
    playFormat: 'sealed',
    difficulty: null,
    timeKind: 'fixed_block',
    availability: 'available',
    priceAmount: 100,
    priceCurrency: 'USD',
    priceDisplay: '$100',
    purchaseRequired: true,
    purchaseStatus: 'none',
    requirements: [],
    sections: [],
    relevanceReasons: [],
    ...overrides,
  }
}
