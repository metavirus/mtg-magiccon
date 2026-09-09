const TOPICS = /spell slayers|\bbosco\b|irene the alien|\bguest\b|\bcreator\b|artist|panel|meet.and.greet|floor.?map|floor.?plan|catalog|prize wall|black lotus|pickup|pick.up|registration hours|will.call|accessibility|mobile app/i
const RESOURCE = /artist|guest|experience|panel|map|floor.?plan|catalog|store|prize.wall|mobile.app|application|portfolio.review|cosplay/i
const official = value => {
  try { const url = new URL(value); return url.protocol === 'https:' && ['mcatlanta.mtgfestivals.com', 'www.mtgfestivals.com', 'mtgfestivals.com'].includes(url.hostname) } catch { return false }
}

export function editorialAllowsFactExtraction(evidence = {}) {
  if (evidence.editorial?.disposition === 'noise') return false
  return evidence.geographicRelevance !== 'uncertain' || (evidence.editorial?.reviewed === true && evidence.editorial?.disposition === 'home')
}

export function editorialDecision(row, decisions = {}) {
  const evidence = row.evidence ?? {}
  const override = decisions[row.fingerprint] ?? evidence.reviewedEditorial
  if (override) {
    if (!['home', 'noise'].includes(override.disposition) || !override.reason?.trim()) throw new Error(`Invalid editorial decision for ${row.fingerprint}`)
    if (override.disposition === 'home' && (!override.title?.trim() || !override.summary?.trim())) throw new Error(`Editorial Home decision needs title and summary: ${row.fingerprint}`)
    return { ...override, reviewed: true }
  }
  if (!official(row.source_url)) return { disposition: 'pending', reason: 'Source requires agent interpretation.' }
  if (evidence.geographicRelevance === 'uncertain') return { disposition: 'pending', reason: 'Article was inspected but Atlanta relevance is uncertain; agent must review before routing.' }
  const current = String(evidence.current?.textSample ?? evidence.semanticSummary ?? '')
  const previous = String(evidence.previous?.textSample ?? '')
  const added = evidence.linkDelta?.added ?? []
  const parseLink = value => {
    const separator = value.lastIndexOf(' -> ')
    if (separator < 0) return null
    const label = value.slice(0, separator).trim(), url = value.slice(separator + 4)
    return official(url) ? { label, url } : null
  }
  const links = added.map(parseLink).filter(link => link && RESOURCE.test(`${link.label} ${link.url}`))
  if (links.length) return {
    disposition: 'home', title: links.length === 1 ? links[0].label : `${row.source_label}: new official resources`,
    summary: [
      `New on the official Atlanta site: ${links.map(link => link.label).join('; ')}.`,
      ...(evidence.linkDelta?.removed?.length
        ? [`Also removed: ${evidence.linkDelta.removed.map(value => parseLink(value)?.label ?? value).join('; ')}.`]
        : []),
    ].join(' '),
    links, reason: 'New official resource links match convention interests; link publication is distinct from inventory availability.',
  }
  const changedPassages = current.split(/(?<=[.!?])\s+|[\r\n]+/).map(text => text.trim()).filter(text => text && !previous.includes(text))
  const interesting = changedPassages.find(text => TOPICS.test(text))
  if (interesting && (previous || evidence.intake_kind === 'first_party_newsletter')) return {
    disposition: 'home', title: row.source_label,
    summary: interesting.length > 360 ? `${interesting.slice(0, 357)}…` : interesting,
    reason: 'Changed first-party passage concerns a watched convention interest.',
  }
  // Absence of a recognized fact is not evidence that a change is noise.
  return { disposition: 'pending', reason: 'No supported editorial disposition yet; agent must inspect the retained change.' }
}

export function applyEditorialDecision(row, decision) {
  if (decision.disposition === 'pending') return { ...row, evidence: { ...row.evidence, editorial: decision } }
  return {
    ...row,
    destination: decision.disposition === 'home' ? 'Home' : 'Activity',
    status: decision.disposition === 'home' ? 'unread' : 'archived',
    title: decision.title ?? row.title, summary: decision.summary ?? row.summary,
    review_question: decision.disposition === 'home' ? 'Useful official news; no action required.' : decision.reason,
    evidence: { ...row.evidence, editorial: decision, ...(decision.disposition === 'home' ? { home_signal_kind: 'interesting_announcement', presentation_links: decision.links ?? [] } : {}) },
  }
}
