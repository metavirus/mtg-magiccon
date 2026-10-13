import snapshot from './conventionPrograms.json'
import council from './councilsCall.json'

const days = { '2026-11-13': 'Fri', '2026-11-14': 'Sat', '2026-11-15': 'Sun' } as const

// LEAP supplies Atlanta wall-clock strings, not UTC instants. Preserve them.
function timeLabel(value: string) {
  const hour = Number(value.slice(11, 13))
  const minute = value.slice(14, 16)
  return `${hour % 12 || 12}${minute === '00' ? '' : `:${minute}`} ${hour < 12 ? 'AM' : 'PM'}`
}

export const conventionProgramSources = snapshot.sources
export const conventionProgramEvents = snapshot.sessions.map(session => {
  const day = days[session.startTime.slice(0, 10) as keyof typeof days]
  if (!day || session.endTime.slice(0, 10) !== session.startTime.slice(0, 10)) throw new Error(`Unsupported convention program day: ${session.id}`)
  const meet = session.sourceId === 'atlanta-experience-meet-and-greets'
  const grounds = session.sourceId === 'atlanta-gathering-grounds-schedule'
  const family = session.location === 'Family Magic'
  const wristband = /wristband required/i.test(session.title)
  const pending = /More Magic Coming Soon/i.test(session.title)
  const sameTime = session.startTime === session.endTime
  return {
    id: `program-${session.id}`, title: session.title, day,
    time: sameTime ? timeLabel(session.startTime) : `${timeLabel(session.startTime)}–${timeLabel(session.endTime)}`,
    window: sameTime ? 'End time not clarified by source' : 'Scheduled program',
    price: 'included', kind: family ? 'Family Magic' : grounds ? 'Gathering Grounds' : 'Convention program',
    type: 'info' as const,
    format: meet ? 'Meet & greet' : family ? 'Family activity' : grounds ? 'Community program' : 'Panel / live show',
    tags: ['official atlanta', 'included', ...(family ? ['family magic'] : grounds ? ['gathering grounds'] : meet ? ['meet & greet'] : ['panels']), ...(wristband ? ['wristband required'] : []), ...(pending ? ['tbd'] : [])],
    state: 'none' as const, availability: pending ? 'changed' as const : 'open' as const,
    complexity: 'unknown' as const,
    complexityWhy: 'Review the published session description for participation requirements.',
    fit: 'Published Atlanta convention program; select it if it belongs in your plan.',
    detail: `${session.location}. Times are Atlanta local time. ${session.description}${wristband ? ' Wristbands are distributed from 8:30 AM on the session day in Concourse C Lobby, first come, first served. No standby queue.' : ''}`,
    officialUrl: session.detailUrl,
    decisionFacts: [{ label: 'Location', value: session.location }, ...(wristband ? [{ label: 'Access', value: 'Wristband required; same-day pickup from 8:30 AM' }] : [])],
    sourceNote: 'Official Atlanta event-bound schedule, reviewed from October 13, 2026 cloud checkpoint. Schedule subject to change.',
    planEffect: 'A planning option; attendance is set only by your saved selection.',
  }
})

export const councilsCallEvents = council.sessions.map(session => ({
  id: session.id, title: session.title, day: 'Fri' as const, time: session.time,
  window: '2 hours', price: `$${council.price}`, kind: 'Convention program', type: 'social' as const,
  format: 'Immersive dining', tags: ['official atlanta', 'dinner', '21+', 'paid'],
  state: 'none' as const, availability: 'open' as const, complexity: 'easy' as const,
  complexityWhy: 'Interactive participation is optional; allow travel time to the venue.',
  fit: 'Separate paid dinner experience; compare with your Friday schedule.',
  detail: `${council.location}. Friday November 13, Atlanta local time. $299 per person including taxes and fees. Open bar, passed appetizers, seated dinner, dessert and interactive entertainment; $15 Uber voucher. Age 21+ with valid photo ID and MagicCon Atlanta badge required. Tickets are non-refundable and non-transferable. Published offer; current checkout availability is not verified.`,
  officialUrl: council.url,
  decisionFacts: [{ label: 'Access', value: '21+; Atlanta badge and separate dinner ticket required' }, { label: 'Location', value: council.location }, { label: 'Price', value: '$299 per person, taxes and fees included' }],
  moreDetails: [{ label: 'Dietary requests', value: 'Submit by November 1, 2026; shared kitchen cannot guarantee an allergen-free meal.' }, { label: 'Ticket terms', value: 'Valid only for the selected Council time; no refunds or transfers.' }],
  sourceNote: 'Official Atlanta Council’s Call page, reviewed from October 13, 2026 cloud checkpoint. Checkout availability unverified.',
  planEffect: 'A planning option; this does not imply a ticket purchase or attendance commitment.',
}))
