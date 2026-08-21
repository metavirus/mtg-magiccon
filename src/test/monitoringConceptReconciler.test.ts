import { describe, expect, it } from 'vitest'
import { reconcileMonitoringObservation } from '../../scripts/lib/monitoring_concept_reconciler.mjs'

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
    expect(result).toMatchObject({ resolution: 'milestone_transition', concept: { attention_state: 'milestone_transition', current_state: { phase: 'open' } } })
  })
  it('retains a contradiction instead of overwriting active truth', () => {
    const result = reconcileMonitoringObservation(observation('faq', 'The FAQ says Ticketed Play sales open August 26 at 10 AM PT, while the schedule still says August 25 at 10 AM PT.'), existing)
    expect(result).toMatchObject({ resolution: 'contradiction', concept: { attention_state: 'contradiction', current_state: saleClaim } })
  })
})
