import { createHash } from 'node:crypto'
import { extractRegisteredInfoClaims, registryEntryForConcept } from './maintained_info_claim_registry.mjs'

export const CONCEPT_RULE_VERSION = 3
const SALE_CONCEPT_KEY = 'atlanta:ticketed-play:sales-opening'

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

export function extractMonitoringConcepts(observation) {
  const text = normalizedText(observation)
  const registered = extractRegisteredInfoClaims(observation, text).map(({ entry, claim }) => ({ concept_key: entry.conceptKey, concept_kind: 'info_article_fact', title: entry.title, consequence_class: entry.consequenceClass, claim }))
  const saleClaim = ticketedPlaySaleClaim(text)
  if (saleClaim) registered.push({ concept_key: SALE_CONCEPT_KEY, concept_kind: 'ticketed_play_sales', title: 'Ticketed Play sales', claim: saleClaim })
  return registered
}

export function extractMonitoringConcept(observation) {
  return extractMonitoringConcepts(observation)[0] ?? null
}

function sameClaim(a, b) {
  const semantic = value => {
    if (!value) return {}
    if (Array.isArray(value.resources)) return { resources: value.resources.map(resource => resource.url).sort() }
    if (value.section_key && value.fact_label) return { topic_key: value.topic_key, section_key: value.section_key, fact_label: value.fact_label, value_kind: value.value_kind, value: value.value }
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

export function reconcileMonitoringObservation(observation, existingConcept = null, extractedOverride = null) {
  const extracted = extractedOverride ?? extractMonitoringConcept(observation)
  const text = normalizedText(observation)
  const base = { observation_fingerprint: observationFingerprint(observation), rule_version: CONCEPT_RULE_VERSION }
  if (!extracted) return { ...base, resolution: 'noise', concept: null, rationale: 'No deterministic planning concept or material fact was extracted.' }
  if (!existingConcept) return {
    ...base, resolution: 'new', concept: { ...extracted, attention_state: 'informational', current_summary: observation.summary || observation.title, current_state: withProvenance(extracted.claim, observation) },
    rationale: 'First retained evidence for this deterministic concept key.',
  }
  if (existingConcept.concept_key !== extracted.concept_key) return { ...base, resolution: 'noise', concept: null, rationale: 'The extracted fact is distinct from the supplied maintained concept.' }
  const registeredEntry = extracted.concept_kind === 'info_article_fact' ? registryEntryForConcept(extracted.concept_key) : null
  const existingState = registeredEntry ? { ...existingConcept.current_state, topic_key: existingConcept.current_state?.topic_key ?? registeredEntry.topicKey, value_kind: existingConcept.current_state?.value_kind ?? registeredEntry.valueKind } : existingConcept.current_state
  if (sameClaim(existingState, extracted.claim)) return {
    ...base, resolution: 'corroboration', concept: { ...existingConcept, latest_resolution: 'corroboration', current_state: withProvenance(existingState, observation, existingState) },
    rationale: 'The observation supports the existing semantic state and adds provenance only.',
  }
  if (extracted.concept_kind === 'info_article_fact'
    && existingState?.topic_key === extracted.claim.topic_key
    && existingState?.section_key === extracted.claim.section_key
    && existingState?.fact_label === extracted.claim.fact_label
    && existingState?.value_kind === extracted.claim.value_kind
    && existingState?.value
    && existingState.value !== extracted.claim.value) return {
    ...base, resolution: 'contradiction', concept: { ...existingConcept, latest_resolution: 'contradiction', attention_state: 'contradiction', current_state: existingState, proposed_state: withProvenance(extracted.claim, observation) },
    rationale: 'Two comparable trusted first-party observations publish different values for the same registered maintained fact; retain both for a concrete factual choice.',
  }
  if (extracted.concept_kind === 'ticketed_play_sales' && incompatibleSaleClaim(existingConcept.current_state, extracted.claim, text)) return {
    ...base, resolution: 'contradiction', concept: { ...existingConcept, latest_resolution: 'contradiction', attention_state: 'contradiction', current_state: withProvenance(existingConcept.current_state, observation, existingConcept.current_state), proposed_state: extracted.claim },
    rationale: 'The observation conflicts with an active date, time, or sale-state claim; both states must be retained for review.',
  }
  const previousPhase = existingConcept.current_state?.phase
  const nextPhase = extracted.claim?.phase
  if (previousPhase === 'announced' && ['open', 'sold_out', 'cancelled'].includes(nextPhase)) return {
    ...base, resolution: 'milestone_transition', concept: { ...existingConcept, latest_resolution: 'milestone_transition', attention_state: 'milestone_transition', current_state: withProvenance({ ...extracted.claim, milestone_opened_at: observation.observedAt }, observation, existingConcept.current_state), current_summary: observation.summary || observation.title },
    rationale: `Ticketed Play sales transitioned from ${previousPhase} to ${nextPhase}.`,
  }
  return {
    ...base, resolution: 'material_update', concept: { ...existingConcept, latest_resolution: 'material_update', attention_state: 'material_update', current_state: withProvenance(extracted.claim, observation, existingConcept.current_state), current_summary: observation.summary || observation.title },
    rationale: 'A planning-relevant claim field changed without creating a separate concept.',
  }
}

export function factualChoiceFindingForResolution(resolution, observation, canonicalArticle) {
  const entry = registryEntryForConcept(resolution?.concept?.concept_key)
  if (resolution?.resolution !== 'contradiction' || !entry) return null
  const previous = resolution.concept.current_state
  const proposed = resolution.concept.proposed_state
  const facts = canonicalArticle?.sections?.find(section => section.key === previous?.section_key)?.facts
  const canonicalFact = Array.isArray(facts) ? facts.find(fact => fact.label === previous?.fact_label) : null
  if (!previous?.value || !proposed?.value || canonicalFact?.value !== previous.value) return null
  const values = [previous.value, proposed.value].sort()
  const fingerprint = createHash('sha256').update(JSON.stringify({ concept_key: entry.conceptKey, values })).digest('hex')
  const priorEvidence = Array.isArray(previous.provenance) ? previous.provenance : []
  const proposedEvidence = Array.isArray(proposed.provenance) ? proposed.provenance : provenance(observation)
  return {
    fingerprint, source_id: observation.sourceId, source_label: `Conflicting official sources for ${entry.title}`, source_url: observation.sourceUrl,
    destination: 'Activity', title: `Confirm ${entry.title}`,
    summary: `The maintained fact says ${previous.value}. Another official source says ${proposed.value}.`,
    review_question: `Which value should the maintained ${entry.title} fact use?`, status: 'needs_review',
    action_type: 'resolve_info_topic_article_fact_conflict',
    action_payload: { target_kind: 'info_topic_article_fact', topic_key: entry.topicKey, section_key: previous.section_key, fact_label: previous.fact_label, concept_key: entry.conceptKey, consequence_class: entry.consequenceClass, choice_options: [
      { choice_key: 'proposed', label: `Use ${proposed.value}`, value: proposed.value, source_evidence: proposedEvidence },
      { choice_key: 'maintained', label: `Keep ${previous.value}`, value: previous.value, source_evidence: priorEvidence },
    ] },
    rollback_payload: { operation: 'restore_info_topic_article_fact', topic_key: entry.topicKey, section_key: previous.section_key, fact_label: previous.fact_label, value: previous.value },
    evidence: { concept_key: entry.conceptKey, value_kind: entry.valueKind, resolution: 'contradiction', compared_claims: [{ value: previous.value, sources: priorEvidence }, { value: proposed.value, sources: proposedEvidence }] },
    last_seen_at: observation.observedAt, updated_at: observation.observedAt,
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
