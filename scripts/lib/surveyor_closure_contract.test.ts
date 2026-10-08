import { describe, expect, it } from 'vitest'
import {
  assertSupportedSurveyorCatches,
  completeSurveyorClosureManifest,
  validateSurveyorClosureManifest,
  validatePendingSurveyorEditorialManifest,
} from './surveyor_closure_contract.mjs'

const readback = { system: 'supabase', relation: 'monitoring_findings', match: { fingerprint: 'abc' }, observed: { id: 'finding-1', status: 'unread' } }

describe('surveyor catch-to-closure contract', () => {
  it('accepts exactly one verified terminal disposition per meaningful catch', () => {
    const report = { checkedAt: '2026-08-25T20:00:00Z', changes: [{ id: 'atlanta-faq' }] }
    const outcomes = new Map([['0:atlanta-faq', {
      disposition: 'retained_evidence',
      targets: [{ kind: 'activity', identifier: 'finding-1' }],
      readbacks: [readback],
      rationale: 'The official source evidence remains visible in Activity.',
    }]])
    expect(validateSurveyorClosureManifest(completeSurveyorClosureManifest(report, outcomes), report).status).toBe('complete')
  })

  it('rejects a novel unmapped meaningful catch', () => {
    const report = { checkedAt: '2026-08-25T20:00:00Z', changes: [{ id: 'discord-rumor', intakeKind: 'novel_social_intake' }] }
    expect(() => assertSupportedSurveyorCatches(report)).toThrow(/unmapped meaningful catch.*novel_social_intake/i)
  })

  it('rejects blocked catches and missing readback proof', () => {
    const report = { checkedAt: '2026-08-25T20:00:00Z', changes: [{ id: 'atlanta-faq' }] }
    expect(() => validateSurveyorClosureManifest({
      schemaVersion: 1,
      status: 'complete',
      report: { checkedAt: report.checkedAt, changeCount: 1 },
      catches: [{ catchId: '0:atlanta-faq', sourceId: 'atlanta-faq', intakeKind: 'public_watch', meaningful: true, disposition: 'blocked', targets: [], readbacks: [] }],
    }, report)).toThrow(/blocked or unmapped/)
  })

  it('binds the complete report bytes and each catch source identity', () => {
    const report = { checkedAt: '2026-10-08T12:00:00Z', changes: [{ id: 'atlanta-faq', current: { textHash: 'reviewed' } }] }
    const outcomes = new Map([['0:atlanta-faq', { disposition: 'retained_evidence', targets: [{ kind: 'activity', identifier: 'finding-1' }], readbacks: [readback] }]])
    const manifest = completeSurveyorClosureManifest(report, outcomes)
    expect(() => validateSurveyorClosureManifest(manifest, { ...report, changes: [{ ...report.changes[0], current: { textHash: 'different' } }] })).toThrow(/digest/)
    expect(() => validateSurveyorClosureManifest({ ...manifest, catches: [{ ...manifest.catches[0], sourceId: 'other-source' }] }, report)).toThrow(/identity mismatch/)
  })

  it('permits only a verified editorial handoff, never completion or an arbitrary blocked catch', () => {
    const report = { checkedAt: '2026-10-08T12:00:00Z', changes: [{ id: 'atlanta-faq' }] }
    const outcome = { disposition: 'pending_editorial', targets: [{ kind: 'agent_editorial_queue', identifier: 'finding-1' }], readbacks: [readback], rationale: 'Agent interpretation required: abc.' }
    const manifest = completeSurveyorClosureManifest(report, new Map([['0:atlanta-faq', outcome]]), report.checkedAt, false)
    expect(validatePendingSurveyorEditorialManifest(manifest, report).status).toBe('blocked')
    expect(() => validateSurveyorClosureManifest(manifest, report)).toThrow(/pending_editorial/)
    expect(() => validatePendingSurveyorEditorialManifest({ ...manifest, catches: [{ ...manifest.catches[0], targets: [{ kind: 'activity', identifier: 'finding-1' }] }] }, report)).toThrow(/handoff/)
  })
})
