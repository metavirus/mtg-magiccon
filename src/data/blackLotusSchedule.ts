// Reviewed official source snapshot. Stable IDs are selection keys, not titles/times.
// Update this catalog after reviewing the complete daily schedule; never infer an end
// time for a source that publishes only a start. Logistics are not selectable events.
export const blackLotusSource = {
  owner: 'MagicCon / Wizards of the Coast',
  url: 'https://mcatlanta.mtgfestivals.com/en-us/badges/buy-badges/black-lotus-vip-experience.html',
  retrievedAt: '2026-10-13',
  timezone: 'America/New_York',
  caveat: 'Titles, times, and guests may be subject to change. Event locations will be announced closer to the event; Behind the Card Frame is in the Signia Ballroom.',
} as const

type Day = 'Thu' | 'Fri' | 'Sat' | 'Sun'
type Session = { id: string; title: string; day: Day; time: string; window: string; type: 'play' | 'social' | 'info'; format: string; detail: string; facts?: Array<{ label: string; value: string }> }
const megaDetail = 'Three-hour playtest with the Magic Rules Management team: 30 players in ten teams of three. Limited slots; pre-register in the lounge no later than 2:00 PM on the day of the session. Begins with a rules briefing. Check the Black Lotus Atlanta Discord for further information.'

// Legacy TBD IDs retain selections when the published start remains the same:
// 2 PM -> flavor text; 3 PM -> concept art. The removed 5:30 PM slot is
// retained separately; its saved choice cannot be transferred to another session.
export const blackLotusSessions: Session[] = [
  { id: 'bl-progressive-sealed', title: 'BL Progressive Sealed League', day: 'Thu', time: '12 PM start', window: 'Weekend-long league', type: 'play', format: 'Progressive sealed league', detail: 'Pick up 4 Magic: The Gathering | Star Trek play boosters starting Thursday and build a 40-card deck. Play at least 2 games each day Friday through Sunday to add a Star Trek Collector Booster to your pool the following day. Six games earn three total boosters. Final booster-prize claim: Sunday at 5 PM. Playing and defeating Wizards staff or special guests in the lounge may earn additional prizes.', facts: [{ label: 'Prep', value: 'Build a 40-card deck from 4 Star Trek play boosters' }, { label: 'Daily play', value: '2 games each day Fri–Sun' }, { label: 'Final claim', value: 'Sunday 5 PM' }] },
  { id: 'bl-first-look-thursday', title: 'BL First Look Thursday', day: 'Thu', time: '1-8 PM', window: 'Program block', type: 'info', format: 'First Look / Behind the Card Frame', detail: 'First Look activities are consolidated at the MagicCon venue. Behind the Card Frame runs in the Signia Ballroom. Individual sessions below have their own published times; use those for your Plan rather than duplicating the whole program block.' },
  { id: 'bl-thursday-welcome', title: 'Welcome to MagicCon: Atlanta and the Black Lotus Lounge', day: 'Thu', time: '1:30-1:45 PM', window: '15 minutes', type: 'info', format: 'Welcome', detail: 'Opening welcome for the Black Lotus Thursday program.' },
  { id: 'bl-thursday-tbd-2', title: 'What Goes Into Flavor Text — Reality Fracture Edition', day: 'Thu', time: '2-2:45 PM', window: '45 minutes', type: 'info', format: 'Behind the Card Frame', detail: 'The official Thursday schedule now names the former 2 PM content slot: What Goes Into Flavor Text Reality Fracture Edition.' },
  { id: 'bl-thursday-tbd-3', title: 'Reality Fracture Concept Art Wall', day: 'Thu', time: '3 PM', window: 'End time not published', type: 'info', format: 'Concept art', detail: 'The official Thursday schedule lists the Reality Fracture Concept Art Wall at 3 PM, with no end time. This is a start-time reference rather than a fixed-duration Plan block.' },
  { id: 'bl-iconic-deck-histories', title: 'Iconic Deck Histories: Control', day: 'Thu', time: '3:15-4 PM', window: '45 minutes', type: 'info', format: 'Behind the Card Frame', detail: 'Hosted by Brian David-Marshall with special guests. This is a newly identified session; saved choices for the former unnamed 5:30 PM slot do not apply to it.' },
  { id: 'bl-design-planechase', title: 'Design the Unknown Planechase Card', day: 'Thu', time: '4:30-5:30 PM', window: '1 hour', type: 'info', format: 'Interactive design session', detail: 'Create a new plane for a future exclusive Black Lotus VIP event with the Casual Play Design team. Bring ideas and hone your design skills. Hosted by Melissa DeTora, Megan Smith, Elizabeth Rice, and Gabriel Dix.' },
  { id: 'bl-paint-sip', title: 'Black Lotus Paint & Sip', day: 'Thu', time: '6-7:30 PM', window: '90 minutes', type: 'social', format: 'Paint & Sip', detail: 'Join Magic Art Director Brittney Irving and a renowned Magic artist for a Bob Ross-style paint along with themed cocktails. Designed for fans of all artistic backgrounds.' },
  { id: 'bl-partner-showcase', title: 'Black Lotus Partner Showcase', day: 'Thu', time: '8-8:45 PM', window: '45 minutes', type: 'info', format: 'Partner showcase', detail: 'Find out what is on the horizon for Magic with its partners for 2027. The source omits the meridiem on this line; PM follows the Thursday evening schedule context.' },
  { id: 'bl-welcome-reception', title: 'BL Welcome Reception + First Look', day: 'Thu', time: '8:45-11 PM', window: '2 hours 15 minutes', type: 'social', format: 'Reception', detail: 'Casual mixer with Wizards of the Coast members and special guests. Chat, grab a signature, or discuss strategy and design. Light food provided; no-host bar.' },
  ...(['Fri', 'Sat', 'Sun'] as const).map(day => ({ id: `bl-coffee-chat-${day.toLowerCase()}`, title: 'Coffee Chat with Wizards & Special Guests', day, time: '9-11 AM', window: '2 hours', type: 'social' as const, format: 'Coffee chat', detail: 'Coffee Chat with Wizards and special guests in the Black Lotus lounge.' })),
  ...(['Fri', 'Sat'] as const).map(day => ({ id: `bl-loadingreadyrun-${day.toLowerCase()}`, title: 'Meet & Greet with LoadingReadyRun', day, time: '1-2 PM', window: '1 hour', type: 'social' as const, format: 'Meet & greet', detail: 'Meet and greet in the Black Lotus lounge. The official source spells the name “LoadyReadyRun”; normalized here to LoadingReadyRun.' })),
  { id: 'bl-friday-play-event', title: 'Mirror Mayhem 2HG with WZ Special Guests', day: 'Fri', time: '2-6 PM', window: '4 hours', type: 'play', format: '8-pack Sealed Two-Headed Giant', detail: 'Enter the Echoverse with Reality Fracture mirrored pairs. Team up with a friend for an 8-pack Sealed 2HG event. Share a card pool, build two 40-card decks and a shared sideboard; no card-sharing limit. Teams start at 30 shared life.', facts: [{ label: 'Prep', value: 'A teammate; two 40-card decks from a shared sealed pool' }, { label: 'Format', value: '8-pack Sealed 2HG; shared 30 life' }] },
  ...(['Sat', 'Sun'] as const).map(day => ({ id: `bl-mark-rosewater-${day.toLowerCase()}`, title: 'Meet & Greet with Mark Rosewater', day, time: '10-11 AM', window: '1 hour', type: 'social' as const, format: 'Meet & greet', detail: 'Meet and greet with Mark Rosewater in the Black Lotus lounge.' })),
  { id: 'bl-planechase', title: 'BL Planechase Unknown', day: 'Sat', time: '11:30 AM-3 PM', window: '3 hours 30 minutes', type: 'play', format: 'Planechase Unknown Commander', detail: 'WotC Casual Play Designers and members of the Commander Format Panel present Planechase Unknown. Bring a Commander deck. Each VIP takes home 5 assorted playtest planes and a MagicCon-themed planar die.', facts: [{ label: 'Prep', value: 'Bring a Commander deck' }, { label: 'Take home', value: '5 assorted playtest planes and a planar die' }] },
  { id: 'bl-game-knights-sun', title: 'Meet & Greet with Game Knights', day: 'Sun', time: '12:30-1:30 PM', window: '1 hour', type: 'social', format: 'Meet & greet', detail: 'Meet and greet with Game Knights in the Black Lotus lounge.' },
  { id: 'bl-mystery-booster-drafts', title: 'BL Mystery Booster 2 Drafts', day: 'Sun', time: '1-5 PM', window: 'On-demand drafts', type: 'play', format: 'Mystery Booster 2 draft', detail: 'Drafts fire whenever 8 players gather starting at 1 PM Sunday. Limit 2 per person. Last draft fires at 4 PM regardless of participants. No pairings or prizes; play against Wizards for a chance at extra boosters.', facts: [{ label: 'Limit', value: '2 drafts per person' }, { label: 'Last fire', value: 'Sunday 4 PM' }] },
  ...(['Fri', 'Sat', 'Sun'] as const).map(day => ({ id: `bl-mega-game-${day.toLowerCase()}`, title: 'MagicCon: Atlanta MEGA Game Playtest', day, time: day === 'Sun' ? '2:30-5:30 PM' : '3:30-6:30 PM', window: '3 hours', type: 'play' as const, format: 'MEGA Game playtest', detail: megaDetail, facts: [{ label: 'Registration', value: 'In the lounge by 2 PM on the day; limited slots' }, { label: 'Teams', value: '30 players; ten teams of three' }] })),
  { id: 'bl-feedback-session', title: 'BL Meet & Greet / Feedback Session', day: 'Sun', time: '4-5 PM', window: '1 hour', type: 'social', format: 'Meet & greet / feedback', detail: 'Meet and greet / feedback session with the Wizards of the Coast Event Team.' },
]

export const blackLotusLogistics = {
  Thu: ['12 PM lounge opens; league pickup/play begins', '6 PM registration closes; arrive with time to collect your badge', '11 PM lounge closes'],
  Fri: ['8:30 AM lounge opens', '8:30–11 AM beverage service', '9:45 AM priority show-floor entry', '2 PM MEGA Game pre-registration deadline', '7 PM lounge closes'],
  Sat: ['8:30 AM lounge opens', '8:30–11 AM beverage service', '9:45 AM priority show-floor entry', '2 PM MEGA Game pre-registration deadline', '7 PM lounge closes'],
  Sun: ['8:30 AM lounge opens', '8:30–11 AM beverage service', '9:45 AM priority show-floor entry', '2 PM MEGA Game pre-registration deadline', '4 PM last Mystery Booster 2 draft fires', '5 PM final league booster-prize claim', '6 PM lounge closes'],
} satisfies Record<Day, string[]>

export function blackLotusDaySummary(day: Day) {
  return [...blackLotusLogistics[day], ...blackLotusSessions.filter(session => session.day === day && session.id !== 'bl-first-look-thursday').map(session => `${session.time} ${session.title}`)].join('; ') + '. Times are Atlanta local time. Schedule subject to change.'
}

export const blackLotusExploreEvents = blackLotusSessions.map(session => ({
  id: session.id, title: session.title, day: session.day, time: session.time, window: session.window,
  price: 'included', kind: 'Black Lotus', type: session.type, format: session.format,
  tags: ['official atlanta', 'included', 'black lotus', session.format.toLowerCase()],
  // Personal state is applied later from persisted selections, never from this source.
  state: 'none' as const, availability: 'open' as const,
  complexity: session.type === 'play' ? 'focused' as const : 'easy' as const,
  complexityWhy: session.type === 'play' ? 'Read the published rules and preparation requirements.' : 'No gameplay preparation required.',
  fit: session.detail,
  detail: session.detail,
  officialUrl: blackLotusSource.url,
  decisionFacts: [{ label: 'Access', value: 'Black Lotus included; Kavi and Chris can commit' }, ...(session.facts ?? [])],
  moreDetails: [{ label: 'Location / caveat', value: blackLotusSource.caveat }],
  sourceNote: `Official Atlanta Black Lotus VIP page, reviewed ${blackLotusSource.retrievedAt}. Times are Atlanta local time. Schedule subject to change.`,
  planEffect: session.window === 'End time not published' ? 'Start time only; no fixed-duration conflict is inferred.' : 'Compare the published time with your other events before committing.',
}))

// Historical selection identity only: excluded from the current source schedule.
export const blackLotusRetiredEvents = [{
  id: 'bl-thursday-tbd-530', title: 'Former Black Lotus 5:30 PM slot — no longer listed',
  day: 'Thu' as const, time: '5:30-6:15 PM', window: 'Superseded source slot',
  price: 'included', kind: 'Black Lotus', type: 'info' as const, format: 'Superseded / not currently listed',
  tags: ['official atlanta', 'included', 'superseded'], state: 'none' as const,
  availability: 'changed' as const, complexity: 'easy' as const,
  complexityWhy: 'The former unnamed slot is no longer in the current official schedule.',
  fit: 'Saved choice retained for review; this slot is no longer listed.',
  detail: 'The old official schedule listed an unnamed 5:30–6:15 PM Thursday slot. The current official page no longer lists it. Your saved commitment is retained under its original identity and has not been transferred to Iconic Deck Histories or any other session. Remove the choice if it no longer belongs in your plan.',
  officialUrl: blackLotusSource.url,
  decisionFacts: [{ label: 'Status', value: 'Superseded; no current official listing' }],
  sourceNote: `Official Atlanta Black Lotus VIP page, reviewed ${blackLotusSource.retrievedAt}; former source slot is no longer listed.`,
  planEffect: 'Historical saved choice only; review or remove it. This is not confirmed current programming.',
}]
