import { describe, expect, it } from 'vitest'
import { classifyMonitoringFinding } from '../../scripts/lib/monitoring_action_router.mjs'

const finding = {
  fingerprint: 'fdb94a0f97f2e47396b20694c33bf0110d38eff17e6253476e99c5358fb2f187',
  evidence: { monitorCheckedAt: '2026-08-21T18:00:00.000Z', sourceIds: ['atlanta-info', 'atlanta-official-home'], linkDelta: { added: ['Ticketed Play Schedule -> https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html', 'Prize Wall -> https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html'], removed: [] } },
}

describe('monitoring finding classification', () => {
  it('classifies official-link appearance as informational, not executable', () => {
    expect(classifyMonitoringFinding(finding)).toMatchObject({ classification: 'informational_official_links', finding_status: 'unread', action_type: null, execution_status: 'not_started', review_actions: ['mark_read', 'archive'], presentation: { truth_class: 'source_observation', canonical_fact_mutation: false } })
  })
  it('is deterministic across source and link ordering', () => {
    const reordered = classifyMonitoringFinding({ ...finding, evidence: { ...finding.evidence, sourceIds: [...finding.evidence.sourceIds].reverse(), linkDelta: { ...finding.evidence.linkDelta, added: [...finding.evidence.linkDelta.added].reverse() } } })
    expect(reordered.presentation).toEqual(classifyMonitoringFinding(finding).presentation)
  })
  it.each([
    ['missing evidence', { evidence: { sourceIds: ['atlanta-info'] } }],
    ['removed link', { evidence: { ...finding.evidence, linkDelta: { ...finding.evidence.linkDelta, removed: ['old'] } } }],
    ['external host', { evidence: { ...finding.evidence, linkDelta: { added: ['Play -> https://example.com/magic-play'], removed: [] } } }],
  ])('keeps %s non-executable and requiring mapping', (_label, patch) => {
    expect(classifyMonitoringFinding({ ...finding, ...patch })).toMatchObject({ classification: 'requires_mapping', action_type: null, finding_status: 'needs_review' })
  })
})
