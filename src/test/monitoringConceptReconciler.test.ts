import { describe, expect, it } from 'vitest'
import { extractMonitoringConcepts, factualChoiceFindingForResolution, reconcileMonitoringObservation } from '../../scripts/lib/monitoring_concept_reconciler.mjs'
// @ts-expect-error The executable monitoring helper is an ESM script without a declaration file.
import { dueMonitoringMilestoneChanges } from '../../scripts/lib/scheduled_monitoring_milestones.mjs'
import { buildMonitoringCandidateRows } from '../../scripts/lib/build_monitoring_candidates.mjs'

const observation = (sourceId: string, summary: string) => ({ sourceId, sourceUrl: `https://mcatlanta.mtgfestivals.com/${sourceId}`, observedAt: '2026-08-21T20:00:00Z', summary })
const saleClaim = { sale_date: '2026-08-25', sale_time: '10:00', timezone: 'America/Los_Angeles', phase: 'announced' }
const existing = { concept_key: 'atlanta:ticketed-play:sales-opening', concept_kind: 'ticketed_play_sales', current_state: saleClaim, attention_state: 'informational', current_summary: 'Ticketed Play sales open August 25 at 10 AM PT' }

describe('monitoring concept reconciliation', () => {
  it('collapses a cross-source semantic duplicate into corroboration', () => {
    const result = reconcileMonitoringObservation(observation('faq', 'Ticketed Play events go on sale August 25 at 10:00 AM PT.'), existing)
    expect(result).toMatchObject({ resolution: 'corroboration', concept: { concept_key: existing.concept_key, attention_state: 'informational' } })
    expect(result.concept.current_state.provenance).toHaveLength(1)
  })
  it('suppresses menu and wording noise', () => {
    expect(reconcileMonitoringObservation(observation('home', 'FAQ menu wording and footer navigation changed.'))).toMatchObject({ resolution: 'noise', concept: null })
  })
  it('treats first supported concept as new', () => {
    expect(reconcileMonitoringObservation(observation('schedule', 'Ticketed Play sales open August 25 at 10 AM PT.'))).toMatchObject({ resolution: 'new', concept: { concept_key: existing.concept_key } })
  })
  it('surfaces a material date update on the existing concept', () => {
    const result = reconcileMonitoringObservation(observation('schedule', 'Ticketed Play events go on sale August 26 at 10 AM PT.'), existing)
    expect(result).toMatchObject({ resolution: 'material_update', concept: { concept_key: existing.concept_key, attention_state: 'material_update' } })
  })
  it('surfaces a sale-opening milestone transition', () => {
    const result = reconcileMonitoringObservation(observation('schedule', 'Ticketed Play sales are now open. Sale date August 25 at 10 AM PT.'), existing)
    expect(result).toMatchObject({ resolution: 'milestone_transition', concept: { attention_state: 'milestone_transition', current_state: { phase: 'open', milestone_opened_at: '2026-08-21T20:00:00Z' } } })
  })
  it('routes the scheduled sale deadline through the real candidate and concept pipeline', () => {
    const milestone = { id: 'atlanta-ticketed-play-sales-open', label: 'Ticketed Play sales milestone', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play-schedule.html', opensAt: '2026-08-25T10:00:00-07:00', semanticSummary: 'Ticketed Play sales are now open. Sale date August 25 at 10 AM PT.', destination: 'Home' }
    const checkedAt = '2026-08-25T10:15:00-07:00'
    const due = dueMonitoringMilestoneChanges([milestone], {}, checkedAt)
    const row = buildMonitoringCandidateRows({ checkedAt, changes: due.changes })[0]
    const result = reconcileMonitoringObservation({ sourceId: row.source_id, sourceLabel: row.source_label, sourceUrl: row.source_url, observedAt: row.last_seen_at, title: row.title, summary: row.evidence.semanticSummary, text: row.evidence.current.textSample }, existing)
    expect(row.destination).toBe('Home')
    expect(result).toMatchObject({ resolution: 'milestone_transition', concept: { current_state: { phase: 'open', milestone_opened_at: checkedAt } } })
  })
  it('retains a contradiction instead of overwriting active truth', () => {
    const result = reconcileMonitoringObservation(observation('faq', 'The FAQ says Ticketed Play sales open August 26 at 10 AM PT, while the schedule still says August 25 at 10 AM PT.'), existing)
    expect(result).toMatchObject({ resolution: 'contradiction', concept: { attention_state: 'contradiction', current_state: saleClaim } })
  })

  it('routes a first-party Sunday On-Demand cutoff conflict into one precise staged choice payload', () => {
    const checkedAt = '2026-08-24T18:00:00.000Z'
    const [maintainedRow] = buildMonitoringCandidateRows({ checkedAt, changes: [{
      id: 'atlanta-on-demand', label: 'Official On-Demand page', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/on-demand-events.html', destination: 'Activity',
      current: { textSample: 'Sunday On-Demand Constructed & Draft registration hours are 10 AM–3 PM.' }, previous: {}, linkDelta: { added: [], removed: [] },
      semanticSummary: 'Sunday On-Demand Constructed & Draft registration hours are 10 AM–3 PM.',
    }] })
    const maintainedObservation = { fingerprint: maintainedRow.fingerprint, sourceId: maintainedRow.source_id, sourceLabel: maintainedRow.source_label, sourceUrl: maintainedRow.source_url, observedAt: maintainedRow.last_seen_at, summary: maintainedRow.evidence.semanticSummary }
    const first = reconcileMonitoringObservation(maintainedObservation)
    expect(first).toMatchObject({ resolution: 'new', concept: { concept_key: 'atlanta:on-demand-play:registration-hours:constructed-draft:sunday', current_state: { section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', value: '10 AM–3 PM' } } })

    const [newsletterRow] = buildMonitoringCandidateRows({ checkedAt: '2026-08-24T19:00:00.000Z', changes: [{
      id: 'atlanta-newsletter', label: 'Official MagicCon newsletter', url: 'https://mcatlanta.mtgfestivals.com/en-us/newsletter/august-24.html', destination: 'Activity',
      current: { textSample: 'Sunday On-Demand Constructed & Draft registration hours are 10 AM–4 PM.' }, previous: {}, linkDelta: { added: [], removed: [] },
      semanticSummary: 'Sunday On-Demand Constructed & Draft registration hours are 10 AM–4 PM.',
    }] })
    const newsletterObservation = { fingerprint: newsletterRow.fingerprint, sourceId: newsletterRow.source_id, sourceLabel: newsletterRow.source_label, sourceUrl: newsletterRow.source_url, observedAt: newsletterRow.last_seen_at, summary: newsletterRow.evidence.semanticSummary }
    const conflict = reconcileMonitoringObservation(newsletterObservation, first.concept)
    const legacyRuleOneConcept = { ...first.concept, current_state: { section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', category: 'constructed_draft', day: 'sunday', value: '10 AM–3 PM', provenance: first.concept.current_state.provenance } }
    expect(reconcileMonitoringObservation(newsletterObservation, legacyRuleOneConcept)).toMatchObject({ resolution: 'contradiction', concept: { current_state: { topic_key: 'on-demand-play', value_kind: 'time_range' } } })
    const article = { sections: [{ key: 'registration-hours', facts: [{ label: 'Constructed & Draft · Sun', value: '10 AM–3 PM' }, { label: 'Commander · Sun', value: '10 AM–4 PM' }, { label: 'All voucher sales end', value: 'Sunday 3 PM PT' }] }] }
    const staged = factualChoiceFindingForResolution(conflict, newsletterObservation, article)

    expect(conflict).toMatchObject({ resolution: 'contradiction', concept: { concept_key: first.concept.concept_key, current_state: { value: '10 AM–3 PM' }, proposed_state: { value: '10 AM–4 PM' } } })
    expect(staged).not.toBeNull()
    expect(staged!).toMatchObject({
      status: 'needs_review', destination: 'Activity', action_type: 'resolve_info_topic_article_fact_conflict',
      action_payload: { target_kind: 'info_topic_article_fact', topic_key: 'on-demand-play', section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', choice_options: [
        { choice_key: 'proposed', label: 'Use 10 AM–4 PM', value: '10 AM–4 PM' },
        { choice_key: 'maintained', label: 'Keep 10 AM–3 PM', value: '10 AM–3 PM' },
      ] },
      rollback_payload: { operation: 'restore_info_topic_article_fact', topic_key: 'on-demand-play', section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', value: '10 AM–3 PM' },
    })
    expect(staged!.evidence.compared_claims.every((claim: { sources: unknown[] }) => claim.sources.length === 1)).toBe(true)
    expect(factualChoiceFindingForResolution(conflict, newsletterObservation, article)?.fingerprint).toBe(staged!.fingerprint)
    expect(article.sections[0].facts).toEqual([{ label: 'Constructed & Draft · Sun', value: '10 AM–3 PM' }, { label: 'Commander · Sun', value: '10 AM–4 PM' }, { label: 'All voucher sales end', value: 'Sunday 3 PM PT' }])
  })

  it('dedupes corroborating On-Demand cutoff evidence and rejects non-authoritative lookalikes', () => {
    const official = observation('on-demand', 'Sunday On-Demand Constructed & Draft registration hours are 10 AM–3 PM.')
    const first = reconcileMonitoringObservation(official)
    expect(reconcileMonitoringObservation(observation('faq', 'Sunday On-Demand Constructed & Draft registration hours are 10 AM–3 PM.'), first.concept)).toMatchObject({ resolution: 'corroboration' })
    expect(reconcileMonitoringObservation({ ...official, sourceId: 'fan-post', sourceUrl: 'https://example.com/post', summary: 'Sunday On-Demand Constructed & Draft registration hours are 10 AM–4 PM.' }, first.concept)).toMatchObject({ resolution: 'noise', concept: null })
    expect(reconcileMonitoringObservation(observation('nuance', 'Sunday On-Demand Commander registration runs 10 AM–4 PM, while all voucher sales end Sunday at 3 PM PT.'), first.concept)).toMatchObject({ resolution: 'noise', concept: null })
    expect(extractMonitoringConcepts(observation('ambiguous', 'Sunday show floor hours may be 10 AM–6 PM or 10 AM–7 PM.')).some(item => item.concept_key === 'atlanta:hours:show-floor:sunday')).toBe(false)
  })

  it('decomposes a mixed official newsletter and stages only the changed approved maintained fact', () => {
    const newsletter = {
      sourceId: 'atlanta-newsletter', sourceLabel: 'Official MagicCon newsletter', sourceUrl: 'https://mcatlanta.mtgfestivals.com/en-us/newsletter/operations.html', observedAt: '2026-08-24T20:00:00Z',
      summary: 'Ticketed Play sales go on sale August 25 at 10 AM PT. On-Demand vouchers are available in $5 increments. Sunday Prize Wall guests must join the line by 5:30 PM. Sunday show floor hours are 10 AM–7 PM.',
    }
    const extracted = extractMonitoringConcepts(newsletter)
    const byKey = new Map(extracted.map(item => [item.concept_key, item]))
    expect([...byKey.keys()]).toEqual(expect.arrayContaining([
      'atlanta:ticketed-play:sales-opening', 'atlanta:on-demand-play:voucher-price',
      'atlanta:prize-tix:sunday-line-cutoff', 'atlanta:hours:show-floor:sunday',
    ]))
    const maintained = new Map<string, Record<string, unknown>>([
      ['atlanta:ticketed-play:sales-opening', existing],
      ['atlanta:on-demand-play:voucher-price', { concept_key: 'atlanta:on-demand-play:voucher-price', concept_kind: 'info_article_fact', current_state: { topic_key: 'on-demand-play', section_key: 'how-to-play', fact_label: 'Voucher price', value_kind: 'currency_increment', value: '$5 increments' } }],
      ['atlanta:prize-tix:sunday-line-cutoff', { concept_key: 'atlanta:prize-tix:sunday-line-cutoff', concept_kind: 'info_article_fact', current_state: { topic_key: 'prize-tix', section_key: 'location-hours', fact_label: 'Sunday line cutoff', value_kind: 'time', value: '5:30 PM' } }],
      ['atlanta:hours:show-floor:sunday', { concept_key: 'atlanta:hours:show-floor:sunday', concept_kind: 'info_article_fact', current_state: { topic_key: 'hours', section_key: 'hours', fact_label: 'Sunday, Nov. 15', value_kind: 'time_range', value: '10 AM–6 PM', provenance: [{ source_id: 'order', label: 'Order confirmation', url: 'https://mcatlanta.mtgfestivals.com/en-us/order', observed_at: '2026-06-16T00:00:00Z' }] } }],
    ])
    const resolutions = extracted.map(claim => reconcileMonitoringObservation(newsletter, maintained.get(claim.concept_key), claim))
    expect(resolutions.filter(result => result.resolution === 'corroboration')).toHaveLength(3)
    const changed = resolutions.find(result => result.resolution === 'contradiction')
    expect(changed?.concept.concept_key).toBe('atlanta:hours:show-floor:sunday')
    const article = { sections: [{ key: 'hours', facts: [{ label: 'Sunday, Nov. 15', value: '10 AM–6 PM' }] }] }
    const choice = factualChoiceFindingForResolution(changed!, newsletter, article)
    expect(choice).toMatchObject({ action_payload: { topic_key: 'hours', section_key: 'hours', fact_label: 'Sunday, Nov. 15' }, rollback_payload: { value: '10 AM–6 PM' } })
    expect(factualChoiceFindingForResolution(changed!, newsletter, article)?.fingerprint).toBe(choice?.fingerprint)
  })
})
