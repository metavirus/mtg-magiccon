import { homeSignalAgeBucket, homeSignalIsHotNow } from './homeSignalAge'

export type BriefingSignal = {
  id: string
  title: string
  summary: string
  severity: string
  checkedAtIso: string
  sourceKind: string
  objectDetail: { kind: string }
}

const sections = {
  marketplace: 'Artists & marketplace',
  shows: 'Shows & meetups',
  practical: 'Practical details',
  collaboration: 'From the group',
  other: 'More worth knowing',
  quiet: 'Routine updates',
} as const
type SectionKey = keyof typeof sections

function topic(item: BriefingSignal): { section: SectionKey; key: string; label: string; usefulness: number } {
  const title = item.title.toLowerCase()
  const hasTopic = /exhibitor|marketplace|vendor|artist|signing|illustrator|wristband|pickup|pick-up|entrance|transport|flight|hotel|floor map|accessibility|badge|ticket|sold.out|meet.?greet|meet.?and.?greet|meetup|panel|programming|stage|slayers|dinner|dining|brunch|council|family|drawing|workshop/.test(title)
  const text = hasTopic ? title : `${title} ${item.summary}`.toLowerCase()
  if (item.severity === 'quiet' || (item.severity !== 'hot' && /badge.*sold.out|sold.out.*badge/.test(text))) return { section: 'quiet', key: 'routine', label: sections.quiet, usefulness: 0 }
  if (item.sourceKind === 'note' || /selection|activity-log/.test(item.sourceKind)) return { section: 'collaboration', key: 'group', label: sections.collaboration, usefulness: 10 }
  if (/family|drawing|workshop/.test(text)) return { section: 'shows', key: 'experiences', label: 'More experiences', usefulness: 20 }
  // Presentation only: original notices and their detail actions stay intact.
  if (/exhibitor|marketplace|vendor/.test(text)) return { section: 'marketplace', key: 'exhibitors', label: 'Exhibitors', usefulness: /directory|roster/.test(text) ? 42 : 18 }
  if (/artist|signing|illustrator/.test(text) || item.objectDetail.kind === 'artist') return { section: 'marketplace', key: 'artists', label: 'Artists', usefulness: /directory|schedule|plan|bosco|irene/.test(text) ? 38 : 20 }
  if (/wristband|pickup|pick-up|entrance|check.in|transport|flight|hotel|floor map|accessibility/.test(text)) return { section: 'practical', key: 'logistics', label: 'Getting around', usefulness: /changed|change|moved/.test(text) ? 40 : 26 }
  if (/dinner|dining|brunch|council|family|drawing|workshop/.test(text)) return { section: 'shows', key: 'experiences', label: 'More experiences', usefulness: 20 }
  if (/badge|ticket|sold.out/.test(text)) return { section: 'practical', key: 'availability', label: 'Badges & tickets', usefulness: 25 }
  if (/meet.?(&|and|n)?.?greet|meetup|meet.up/.test(text)) return { section: 'shows', key: 'meetups', label: 'Meet & greets', usefulness: /schedule|released|published/.test(text) ? 32 : 20 }
  if (/panel|programming|\bshow\b|stage|slayers/.test(text)) return { section: 'shows', key: 'programming', label: 'Panels & programming', usefulness: /schedule|released|published|slayers/.test(text) ? 45 : 20 }
  return { section: 'other', key: 'other', label: sections.other, usefulness: 15 }
}

export function briefingPreview(summary: string) {
  const clean = summary.replace(/\s+/g, ' ').trim()
  const sentence = clean.match(/^.*?[.!?](?=\s|$)/)?.[0] ?? clean
  if (sentence.length <= 160) return sentence
  const short = sentence.slice(0, 157).replace(/\s+\S*$/, '')
  return `${short}…`
}

export function buildHomeBriefing<T extends BriefingSignal>(items: T[], now = Date.now(), spotlightSlots = 2) {
  const groups = new Map<string, { key: string; label: string; section: SectionKey; items: T[]; score: number }>()
  items.forEach(item => {
    const category = topic(item)
    const urgent = item.severity === 'hot' && homeSignalIsHotNow(item.checkedAtIso, now)
    const key = urgent ? `urgent-${category.key}` : `${category.section}-${category.key}`
    const score = urgent ? 100 : category.usefulness
    const group = groups.get(key) ?? { key, label: category.label, section: category.section, items: [], score }
    group.items.push(item)
    group.score = Math.max(group.score, score)
    groups.set(key, group)
  })
  const ranked = [...groups.values()].filter(group => group.section !== 'quiet' && group.section !== 'collaboration').sort((a, b) => b.score - a.score)
  groups.forEach(group => group.items.sort((a, b) => topic(b).usefulness - topic(a).usefulness))
  const urgent = ranked.filter(group => group.score >= 100)
  const ordinary = ranked.filter(group => group.score >= 28 && group.score < 100)
  const spotlights = [...urgent, ...ordinary.slice(0, Math.max(0, spotlightSlots - urgent.length))]
  const spotlightKeys = new Set(spotlights.map(group => group.key))
  const remaining = [...groups.values()].filter(group => !spotlightKeys.has(group.key))
  return {
    spotlights,
    sections: (Object.entries(sections) as [SectionKey, string][]).map(([key, label]) => ({ key, label, groups: remaining.filter(group => group.section === key) })).filter(section => section.groups.length),
  }
}

export function briefingAgeLabel(item: BriefingSignal, now = Date.now()) {
  if (item.severity === 'hot' && homeSignalIsHotNow(item.checkedAtIso, now)) return 'Hot now'
  return homeSignalAgeBucket(item.checkedAtIso, now) === 'earlier' ? 'Earlier' : 'Recent'
}
