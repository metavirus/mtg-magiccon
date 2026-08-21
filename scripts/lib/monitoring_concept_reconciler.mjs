import { createHash } from 'node:crypto'

export const CONCEPT_RULE_VERSION = 1
const SALE_CONCEPT_KEY = 'atlanta:ticketed-play:sales-opening'
const RESOURCE_CONCEPT_KEY = 'atlanta:magic-play:official-resources-available'

function normalizedText(observation) {
  return [observation.title, observation.summary, observation.text, ...(observation.links ?? []).map(link => typeof link === 'string' ? link : `${link.label ?? ''} ${link.url ?? ''}`)]
    .filter(Boolean).join(' ').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
}

function observationFingerprint(observation) {
  if (/^[a-f0-9]{64}$/i.test(observation.fingerprint ?? '')) return observation.fingerprint.toLowerCase()
  return createHash('sha256').update(JSON.stringify({ sourceId: observation.sourceId, observedAt: observation.observedAt, text: normalizedText(observation) })).digest('hex')
}

function ticketedPlaySaleClaim(text) {
  if (!/ticketed play/.test(text)) return null
  const dateMatch = text.match(/aug(?:ust)?\s+(\d{1,2})/)
  const date = dateMatch ? `2026-08-${dateMatch[1].padStart(2, '0')}` : null
  const time = /10(?::00)?\s*(?:a\.?m\.?|am)\s*(?:pt|pacific)/.test(text) ? '10:00' : null
  if (!date && !time && !/(sales?|tickets?).{0,24}(open|on sale|sold out|cancel)/.test(text)) return null
  const phase = /(cancelled|canceled)/.test(text) ? 'cancelled'
    : /sold[ -]?out/.test(text) ? 'sold_out'
      : /(now open|sales? (?:are |is )?open|on sale now|buy now)/.test(text) ? 'open'
        : /(opens?|on sale|go on sale|sales? start)/.test(text) ? 'announced' : 'unknown'
  return { sale_date: date, sale_time: time, timezone: time ? 'America/Los_Angeles' : null, phase }
}

function officialResourcesClaim(observation, text) {
  const resources = (observation.links ?? []).flatMap(link => {
    const value = typeof link === 'string' ? link : link.url
    if (!value || !/mtgfestivals\.com\/en-us\/magic-play/i.test(value)) return []
    return [{ label: typeof link === 'string' ? value : link.label, url: value }]
  })
  if (!resources.length || !/(magic play|ticketed play|prize wall|on-demand)/.test(text)) return null
  return { resources: [...new Map(resources.map(resource => [resource.url, resource])).values()].sort((a, b) => a.url.localeCompare(b.url)) }
}

export function extractMonitoringConcept(observation) {
  const text = normalizedText(observation)
  const saleClaim = ticketedPlaySaleClaim(text)
  if (saleClaim) return { concept_key: SALE_CONCEPT_KEY, concept_kind: 'ticketed_play_sales', title: 'Ticketed Play sales', claim: saleClaim }
  const resourceClaim = officialResourcesClaim(observation, text)
  if (resourceClaim) return { concept_key: RESOURCE_CONCEPT_KEY, concept_kind: 'official_resource_availability', title: 'Official Magic Play resources', claim: resourceClaim }
  return null
}

function sameClaim(a, b) {
  const semantic = value => {
    if (!value) return {}
    if (Array.isArray(value.resources)) return { resources: value.resources.map(resource => resource.url).sort() }
    return { sale_date: value.sale_date ?? null, sale_time: value.sale_time ?? null, timezone: value.timezone ?? null, phase: value.phase ?? null }
  }
  return JSON.stringify(semantic(a)) === JSON.stringify(semantic(b))
}

function provenance(observation) {
  return observation.sourceUrl ? [{ source_id: observation.sourceId, label: observation.sourceLabel || observation.sourceId, url: observation.sourceUrl, observed_at: observation.observedAt }] : []
}

function withProvenance(state, observation, existingState = {}) {
  const merged = [...(Array.isArray(existingState.provenance) ? existingState.provenance : []), ...provenance(observation)]
  return { ...state, provenance: [...new Map(merged.map(item => [`${item.source_id}|${item.url}`, item])).values()] }
}

function incompatibleSaleClaim(previous, next, text) {
  if (!previous || !next) return false
  const explicitConflict = /(contradict|conflict|while (?:the )?(?:schedule|faq)|different (?:date|time)|still says)/.test(text)
  if (!explicitConflict) return false
  return (previous.sale_date && next.sale_date && previous.sale_date !== next.sale_date)
    || (previous.sale_time && next.sale_time && previous.sale_time !== next.sale_time)
    || previous.phase !== next.phase
}

export function reconcileMonitoringObservation(observation, existingConcept = null) {
  const extracted = extractMonitoringConcept(observation)
  const text = normalizedText(observation)
  const base = { observation_fingerprint: observationFingerprint(observation), rule_version: CONCEPT_RULE_VERSION }
  if (!extracted) return { ...base, resolution: 'noise', concept: null, rationale: 'No deterministic planning concept or material fact was extracted.' }
  if (!existingConcept) return {
    ...base, resolution: 'new', concept: { ...extracted, attention_state: 'informational', current_summary: observation.summary || observation.title, current_state: withProvenance(extracted.claim, observation) },
    rationale: 'First retained evidence for this deterministic concept key.',
  }
  if (existingConcept.concept_key !== extracted.concept_key) throw new Error('Existing concept key does not match the extracted observation concept.')
  if (sameClaim(existingConcept.current_state, extracted.claim)) return {
    ...base, resolution: 'corroboration', concept: { ...existingConcept, latest_resolution: 'corroboration', current_state: withProvenance(existingConcept.current_state, observation, existingConcept.current_state) },
    rationale: 'The observation supports the existing semantic state and adds provenance only.',
  }
  if (extracted.concept_kind === 'ticketed_play_sales' && incompatibleSaleClaim(existingConcept.current_state, extracted.claim, text)) return {
    ...base, resolution: 'contradiction', concept: { ...existingConcept, latest_resolution: 'contradiction', attention_state: 'contradiction', current_state: withProvenance(existingConcept.current_state, observation, existingConcept.current_state), proposed_state: extracted.claim },
    rationale: 'The observation conflicts with an active date, time, or sale-state claim; both states must be retained for review.',
  }
  const previousPhase = existingConcept.current_state?.phase
  const nextPhase = extracted.claim?.phase
  if (previousPhase === 'announced' && ['open', 'sold_out', 'cancelled'].includes(nextPhase)) return {
    ...base, resolution: 'milestone_transition', concept: { ...existingConcept, latest_resolution: 'milestone_transition', attention_state: 'milestone_transition', current_state: withProvenance(extracted.claim, observation, existingConcept.current_state), current_summary: observation.summary || observation.title },
    rationale: `Ticketed Play sales transitioned from ${previousPhase} to ${nextPhase}.`,
  }
  return {
    ...base, resolution: 'material_update', concept: { ...existingConcept, latest_resolution: 'material_update', attention_state: 'material_update', current_state: withProvenance(extracted.claim, observation, existingConcept.current_state), current_summary: observation.summary || observation.title },
    rationale: 'A planning-relevant claim field changed without creating a separate concept.',
  }
}

export function monitoringObservationFromChange(change, checkedAt) {
  return {
    fingerprint: change.fingerprint,
    sourceId: change.id,
    sourceLabel: change.label,
    sourceUrl: change.url,
    observedAt: checkedAt,
    title: change.title ?? change.label,
    summary: change.semanticSummary ?? change.current?.textSample ?? '',
    text: [change.current?.title, change.current?.textSample].filter(Boolean).join(' '),
    links: (change.linkDelta?.added ?? []).map(record => {
      const separator = record.lastIndexOf(' -> ')
      return separator > 0 ? { label: record.slice(0, separator), url: record.slice(separator + 4) } : record
    }),
    rawEvidence: change,
  }
}
