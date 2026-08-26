import { describe, expect, it } from 'vitest'
import { monitoringConceptBaselineFromInfo, projectRegisteredFactResolution, projectResolutionToInfo, verifyRegisteredFactReadback } from '../../scripts/lib/monitoring_info_projection.mjs'

const observation = { fingerprint: 'abc', observedAt: '2026-08-21T00:00:00Z', sourceLabel: 'Official FAQ', sourceUrl: 'https://example.com' }
const concept = { concept_key: 'atlanta:ticketed-play:sales-opening', title: 'Ticketed Play sales', current_summary: 'Sales open August 25.' }

describe('monitoring Info projection', () => {
  const registered = { concept_key: 'atlanta:on-demand-play:voucher-price', concept_kind: 'info_article_fact', title: 'On-Demand voucher price', claim: { topic_key: 'on-demand-play', section_key: 'how-to-play', fact_label: 'Voucher price', value_kind: 'currency_increment', value: '$5 increments' } }
  const topic = { topic_key: 'on-demand-play', updated_at: '2026-08-20T00:00:00Z', sources: [{ key: 'guide', label: 'Official guide', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/on-demand-events.html', retrievedAt: '2026-08-20T00:00:00Z' }], article: { lede: 'Play on demand.', sections: [{ key: 'how-to-play', title: 'How to play', facts: [] }], unknowns: [], contradictions: [], recent_changes: [] } }
  const newsletterObservation = { ...observation, sourceId: 'atlanta-newsletter', sourceLabel: 'Official Atlanta newsletter', sourceUrl: 'https://www.mtgfestivals.com/global/en-us/magiccon-news/atlanta-update.html' }

  it('hydrates a new registered fact and verifies exact canonical readback', () => {
    const resolution = { resolution: 'new', observation_fingerprint: 'catch-new', concept: { ...registered, current_state: registered.claim } }
    const projected = projectRegisteredFactResolution(resolution, newsletterObservation, topic)!
    expect(projected.mutation).not.toBeNull()
    const readback = { ...topic, article: projected.mutation!.article, sources: projected.mutation!.sources, updated_at: projected.mutation!.updated_at }
    expect(projected.receipt).toMatchObject({ disposition: 'canonical_applied', canonical_target: { topic_key: 'on-demand-play', section_key: 'how-to-play', fact_label: 'Voucher price' }, readback: { value: '$5 increments' } })
    expect(verifyRegisteredFactReadback(projected.receipt, readback)).toBe(true)
    expect(readback.article.sections[0].facts).toContainEqual({ label: 'Voucher price', value: '$5 increments' })
  })

  it('seeds the concept baseline from maintained Info and appends same-value provenance', () => {
    const maintained = { ...topic, article: { ...topic.article, sections: [{ ...topic.article.sections[0], facts: [{ label: 'Voucher price', value: '$5 increments' }] }] } }
    const baseline = monitoringConceptBaselineFromInfo(registered, maintained)!
    expect(baseline.current_state).toMatchObject({ value: '$5 increments', provenance: [{ url: topic.sources[0].url }] })
    const resolution = { resolution: 'corroboration', observation_fingerprint: 'catch-same', concept: baseline }
    const projected = projectRegisteredFactResolution(resolution, newsletterObservation, maintained)!
    expect(projected.mutation).not.toBeNull()
    const readback = { ...maintained, article: projected.mutation!.article, sources: projected.mutation!.sources }
    expect(projected.receipt.disposition).toBe('canonical_corroborated')
    expect(readback.sources.map((source: { url: string }) => source.url)).toEqual([topic.sources[0].url, newsletterObservation.sourceUrl])
    expect(verifyRegisteredFactReadback(projected.receipt, readback)).toBe(true)
  })

  it('leaves a trusted changed value to the exact A/B resolver with rollback and no mutation', () => {
    const contradiction = { resolution: 'contradiction', observation_fingerprint: 'catch-conflict', concept: { ...registered, current_state: { ...registered.claim, value: '$5 increments' }, proposed_state: { ...registered.claim, value: '$10 increments' } } }
    const projected = projectRegisteredFactResolution(contradiction, newsletterObservation, topic)!
    expect(projected).toMatchObject({ mutation: null, receipt: { disposition: 'user_choice_staged', canonical_target: { concept_key: registered.concept_key, fact_label: 'Voucher price' } } })
    expect(projectResolutionToInfo(contradiction, newsletterObservation)).toBeNull()
  })
  it('suppresses noise and corroboration', () => {
    expect(projectResolutionToInfo({ resolution: 'noise', concept: null }, observation)).toBeNull()
    expect(projectResolutionToInfo({ resolution: 'corroboration', concept }, observation)).toBeNull()
  })
  it('persists a deterministic meaningful update once', () => {
    const enriched = { ...observation, sourceId: 'official-faq', contentHash: 'hash', infoArticle: { lede: 'Useful.', sections: [{ key: 'sale', title: 'Sale timing' }], unknowns: [], contradictions: [], recent_changes: [] } }
    expect(projectResolutionToInfo({ resolution: 'material_update', concept }, enriched)).toMatchObject({ feed: { entry_key: 'concept-current:ticketed-play', concept_key: 'ticketed-play', topic_key: 'ticketed-play', feed_status: 'current' }, topic: { article_status: 'maintained' } })
  })
  it('does not publish link-only discovery as finished Info', () => expect(projectResolutionToInfo({ resolution: 'new', concept }, observation)).toBeNull())
  it('does not create a generic feed card for a registered newsletter fact', () => expect(projectResolutionToInfo({ resolution: 'new', concept: { ...registered, current_state: registered.claim } }, newsletterObservation)).toBeNull())
})
