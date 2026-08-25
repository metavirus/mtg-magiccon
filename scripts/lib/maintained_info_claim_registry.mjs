const ATLANTA_FIRST_PARTY = {
  hosts: ['mcatlanta.mtgfestivals.com'],
  pathPrefixes: ['/'],
}

const timeRange = String.raw`(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)\s*(?:-|to)\s*(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)`

function displayTimeRange(match) {
  const meridiem = value => value.toLowerCase().startsWith('p') ? 'PM' : 'AM'
  return `${Number(match[1])}${match[2] ? `:${match[2]}` : ''} ${meridiem(match[3])}–${Number(match[4])}${match[5] ? `:${match[5]}` : ''} ${meridiem(match[6])}`
}

function rangedFact({ conceptKey, topicKey, sectionKey, factLabel, title, anchors, consequenceClass = 'activity_choice' }) {
  return {
    conceptKey, topicKey, sectionKey, factLabel, title, valueKind: 'time_range', consequenceClass,
    trustedSourceScope: ATLANTA_FIRST_PARTY,
    extract(text) {
      const sentence = text.split(/(?<=[.!?])\s+|\n+/).find(part => anchors.every(anchor => anchor.test(part)))
      const matches = sentence ? [...sentence.matchAll(new RegExp(timeRange, 'gi'))] : []
      const match = matches.length === 1 ? matches[0] : null
      return match ? displayTimeRange(match) : null
    },
  }
}

export const MAINTAINED_INFO_CLAIM_REGISTRY = [
  rangedFact({ conceptKey: 'atlanta:hours:show-floor:friday', topicKey: 'hours', sectionKey: 'hours', factLabel: 'Friday, Nov. 13', title: 'Friday show-floor hours', anchors: [/show (?:floor )?hours?/, /friday|fri\b/] }),
  rangedFact({ conceptKey: 'atlanta:hours:show-floor:saturday', topicKey: 'hours', sectionKey: 'hours', factLabel: 'Saturday, Nov. 14', title: 'Saturday show-floor hours', anchors: [/show (?:floor )?hours?/, /saturday|sat\b/] }),
  rangedFact({ conceptKey: 'atlanta:hours:show-floor:sunday', topicKey: 'hours', sectionKey: 'hours', factLabel: 'Sunday, Nov. 15', title: 'Sunday show-floor hours', anchors: [/show (?:floor )?hours?/, /sunday|sun\b/] }),
  rangedFact({ conceptKey: 'atlanta:will-call:hours:thursday', topicKey: 'will-call', sectionKey: 'hours', factLabel: 'Thursday, Nov. 12', title: 'Thursday Will Call hours', anchors: [/will call/, /thursday|thu\b/] }),
  rangedFact({ conceptKey: 'atlanta:will-call:hours:friday', topicKey: 'will-call', sectionKey: 'hours', factLabel: 'Friday, Nov. 13', title: 'Friday Will Call hours', anchors: [/will call/, /friday|fri\b/] }),
  rangedFact({ conceptKey: 'atlanta:will-call:hours:saturday', topicKey: 'will-call', sectionKey: 'hours', factLabel: 'Saturday, Nov. 14', title: 'Saturday Will Call hours', anchors: [/will call/, /saturday|sat\b/] }),
  rangedFact({ conceptKey: 'atlanta:will-call:hours:sunday', topicKey: 'will-call', sectionKey: 'hours', factLabel: 'Sunday, Nov. 15', title: 'Sunday Will Call hours', anchors: [/will call/, /sunday|sun\b/] }),
  rangedFact({ conceptKey: 'atlanta:on-demand-play:registration-hours:constructed-draft:sunday', topicKey: 'on-demand-play', sectionKey: 'registration-hours', factLabel: 'Constructed & Draft · Sun', title: 'Constructed & Draft Sunday registration hours', anchors: [/on[ -]demand/, /constructed\s*(?:&|and)\s*draft/, /sunday|sun\b/, /registration/] }),
  rangedFact({ conceptKey: 'atlanta:on-demand-play:registration-hours:commander:sunday', topicKey: 'on-demand-play', sectionKey: 'registration-hours', factLabel: 'Commander · Sun', title: 'Commander Sunday registration hours', anchors: [/on[ -]demand/, /commander/, /sunday|sun\b/, /registration/] }),
  {
    conceptKey: 'atlanta:on-demand-play:voucher-price', topicKey: 'on-demand-play', sectionKey: 'how-to-play', factLabel: 'Voucher price', title: 'On-Demand voucher price', valueKind: 'currency_increment', consequenceClass: 'activity_choice', trustedSourceScope: ATLANTA_FIRST_PARTY,
    extract(text) { const match = /on[ -]demand.{0,100}vouchers?.{0,60}\$(\d+)\s+increments?/i.exec(text); return match ? `$${Number(match[1])} increments` : null },
  },
  {
    conceptKey: 'atlanta:on-demand-play:purchase-cap', topicKey: 'on-demand-play', sectionKey: 'how-to-play', factLabel: 'Purchase cap', title: 'On-Demand voucher purchase cap', valueKind: 'currency_per_visit', consequenceClass: 'activity_choice', trustedSourceScope: ATLANTA_FIRST_PARTY,
    extract(text) { const match = /on[ -]demand.{0,120}(?:up to|maximum|cap).{0,20}\$(\d+).{0,30}per visit/i.exec(text); return match ? `$${Number(match[1])} per visit` : null },
  },
  {
    conceptKey: 'atlanta:prize-tix:sunday-line-cutoff', topicKey: 'prize-tix', sectionKey: 'location-hours', factLabel: 'Sunday line cutoff', title: 'Prize Wall Sunday line cutoff', valueKind: 'time', consequenceClass: 'urgent_activity_choice', trustedSourceScope: ATLANTA_FIRST_PARTY,
    extract(text) { const match = /(?:prize wall|prize tix).{0,100}?(?:join (?:the )?line|line cutoff).{0,40}?\b(\d{1,2})(?::(\d{2}))?\s*(p\.?m\.?|a\.?m\.?)/i.exec(text); return match ? `${Number(match[1])}${match[2] ? `:${match[2]}` : ''} ${match[3].toLowerCase().startsWith('p') ? 'PM' : 'AM'}` : null },
  },
]

export function registryEntryForConcept(conceptKey) {
  return MAINTAINED_INFO_CLAIM_REGISTRY.find(entry => entry.conceptKey === conceptKey) ?? null
}

export function sourceIsTrustedForEntry(entry, sourceUrl) {
  try {
    const url = new URL(sourceUrl)
    return url.protocol === 'https:' && entry.trustedSourceScope.hosts.includes(url.hostname.toLowerCase())
      && entry.trustedSourceScope.pathPrefixes.some(prefix => url.pathname.startsWith(prefix))
  } catch { return false }
}

export function extractRegisteredInfoClaims(observation, text) {
  return MAINTAINED_INFO_CLAIM_REGISTRY.flatMap(entry => {
    if (!sourceIsTrustedForEntry(entry, observation.sourceUrl)) return []
    const value = entry.extract(text)
    return value ? [{ entry, claim: { topic_key: entry.topicKey, section_key: entry.sectionKey, fact_label: entry.factLabel, value_kind: entry.valueKind, value } }] : []
  })
}
