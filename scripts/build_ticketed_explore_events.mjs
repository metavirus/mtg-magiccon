import fs from 'node:fs'

const raw = JSON.parse(fs.readFileSync('research/precanon/ticketed-play/snapshots/2026-08-18_ticketed-play-v1.raw.json', 'utf8'))
const normalized = JSON.parse(fs.readFileSync('research/precanon/ticketed-play/snapshots/2026-08-18_ticketed-play-v1.normalized-draft.json', 'utf8'))
const rawByKey = new Map(raw.events.map(event => [event.sourceEventKey, event]))

const dayFrom = label => label?.startsWith('Fri') ? 'Fri' : label?.startsWith('Sat') ? 'Sat' : label?.startsWith('Sun') ? 'Sun' : 'Fri'
const timeFrom = label => label ? label.replace(/:00 /g, ' ').replace(' - ', '–') : 'Time TBD'
const formatFrom = event => event.playFormat === 'two_headed_giant' ? '2HG' : titleCase(event.playFormat ?? 'ticketed play')
const windowFrom = event => event.timeKind === 'league_window' ? 'League / flexible' : event.timeKind === 'optional_window' ? 'Flexible window' : 'Fixed event'
const complexityFrom = event => event.difficulty === 'competitive' ? 'very-hard' : event.difficulty === 'challenging' ? 'demanding' : event.difficulty === 'social' ? 'easy' : 'inconclusive'

function titleCase(value) {
  return String(value).replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}

function cleanTitle(title) {
  return title
    .replace(/Magic: The Gathering \| /g, '')
    .replace(/MagicCon Atlanta/g, 'Atlanta')
    .replace(/\s+/g, ' ')
    .trim()
}

function complexityWhy(event) {
  if (event.difficulty === 'competitive') return 'Competitive category: probably high-prep/high-pressure unless there is a specific reason to prioritize it.'
  if (event.difficulty === 'challenging') return 'Likely real gameplay commitment: paid, structured, and worth comparing carefully against the weekend plan.'
  if (event.difficulty === 'social') return 'Social play shape: likely more compatible with a relaxed convention weekend than pure competitive events.'
  return 'Official ticketed-play listing; details are staged for review because fit depends on exact format, friends, and schedule conflicts.'
}

function detailLine(lines) {
  return lines
    .slice(0, 100)
    .find(line => line.length > 80 && !/Skip to content|MagicCon:|November 13|Facebook|Instagram|TikTok/i.test(line))
    ?? 'Official ticketed-play detail captured from MagicCon Atlanta.'
}

function moreDetails(rawEvent, event) {
  const lines = rawEvent.rawLines ?? []
  const product = lines.find(line => /^Product:/i.test(line))
  const rounds = lines.find(line => /^Rounds:/i.test(line))
  const prizesIndex = lines.findIndex(line => /^PRIZES/i.test(line))
  const prizeLines = prizesIndex >= 0 ? lines.slice(prizesIndex + 1, prizesIndex + 4).filter(line => /Prize Tix|Win:|Loss:/i.test(line)) : []
  return [
    ...(product ? [{ label: 'Product', value: product.replace(/^Product:\s*/i, '') }] : []),
    ...(rounds ? [{ label: 'Rounds', value: rounds.replace(/^Rounds:\s*/i, '') }] : []),
    ...(prizeLines.length ? [{ label: 'Prize tix', value: prizeLines.join(' · ') }] : []),
    { label: 'Official listing', value: event.sourceUrl },
  ]
}

const events = normalized.events.map(event => {
  const rawEvent = rawByKey.get(event.sourceEventKey)
  const title = cleanTitle(event.title)
  const day = dayFrom(rawEvent.rawDateLabel)
  const time = timeFrom(rawEvent.rawTimeLabel)
  const price = event.price?.display ?? 'free'
  const format = formatFrom(event)
  const tags = ['official atlanta', 'ticketed play', format.toLowerCase()]
  if (event.difficulty && event.difficulty !== 'unknown') tags.push(event.difficulty)
  if (event.timeKind === 'league_window' || event.timeKind === 'optional_window') tags.push('flexible')

  return {
    id: `ticketed-${event.sourceEventKey}`,
    title,
    day,
    time,
    window: windowFrom(event),
    price,
    kind: 'Ticketed play',
    type: 'play',
    format,
    tags,
    state: 'none',
    availability: event.availability === 'sold_out' ? 'sold-out' : 'open',
    complexity: complexityFrom(event),
    complexityWhy: complexityWhy(event),
    fit: `Official ticketed-play listing: ${title}.`,
    detail: detailLine(rawEvent.rawLines ?? []),
    decisionFacts: [
      { label: 'When', value: `${day} · ${time}` },
      { label: 'Price', value: price },
      { label: 'Status', value: event.availability === 'sold_out' ? 'Sold out' : 'Listed' },
    ],
    moreDetails: moreDetails(rawEvent, event),
    sourceNote: `Official Atlanta Ticketed Play schedule, captured Aug 18, 2026. Source ID ${event.sourceEventKey}.`,
    planEffect: event.timeKind === 'league_window' || event.timeKind === 'optional_window'
      ? 'Flexible/league-style listing: keep visible without treating the whole stated window as a hard block until purchased.'
      : 'Paid ticketed event: only becomes a hard calendar block after purchase/commitment.',
  }
})

fs.mkdirSync('src/data', { recursive: true })
fs.writeFileSync(
  'src/data/ticketedPlayExploreEvents.ts',
  `// Generated from research/precanon/ticketed-play snapshots. Do not edit by hand; rerun pnpm ticketed:hydrate-static.\n\nexport const ticketedPlayExploreEvents = ${JSON.stringify(events, null, 2)}\n`,
)

console.log(JSON.stringify({
  count: events.length,
  visibleByDefault: events.filter(event => event.state !== 'nope' && event.state !== 'hidden').length,
  defaultHidden: events.filter(event => event.state === 'nope' || event.state === 'hidden').length,
}, null, 2))
