import { describe, expect, it } from 'vitest'
import { completeSurveyorClosureManifest, pendingSurveyorClosureManifest } from './surveyor_closure_contract.mjs'
import { validateSurveyorSupervisionCompletion } from './surveyor_supervision_contract.mjs'

const quiet = () => ({ checkedAt: '2026-10-01T12:00:00Z', coverageStatus: 'complete', changes: [], failures: [] })
const closed = (report: object) => completeSurveyorClosureManifest(report, new Map())

describe('supervisor must finish agent-owned work before quiet completion', () => {
  it('permits complete quiet cloud artifacts', () => {
    const report = quiet()
    expect(validateSurveyorSupervisionCompletion(report, closed(report))).toMatchObject({ status: 'complete', catchCount: 0 })
  })
  it('rejects pending editorial even when source coverage is complete', () => {
    const report = { ...quiet(), changes: [{ id: 'official-news' }] }
    const manifest = pendingSurveyorClosureManifest(report)
    manifest.catches[0].disposition = 'pending_editorial'
    expect(() => validateSurveyorSupervisionCompletion(report, manifest)).toThrow(/pending_editorial/)
  })
  it.each([
    { coverageStatus: 'partial' },
    { failures: [{ id: 'official-news' }] },
    { newsletterIntake: { unfetched: ['https://example.invalid/news'] } },
    { newsletterIntake: { missingDiscoverySourceIds: ['news-index'] } },
    { newsletterIntake: { failures: [{ sourceId: 'news-index' }] } },
    { newsletterIntake: { failureCount: 1 } },
    { detailPageCoverage: { gaps: [{ url: 'https://example.invalid/detail' }] } },
    { ticketedPlay: { availabilityCoverage: { notCovered: [{ id: 'event' }] } } },
    { gatheringGroundsCoverage: { status: 'partial' } },
    { artistDirectoryCoverage: { status: 'partial' } },
    { panelCoverage: { status: 'not_checked' } },
  ])('rejects unresolved coverage independently of green closure: %j', gap => {
    const report = { ...quiet(), ...gap }
    expect(() => validateSurveyorSupervisionCompletion(report, closed(report))).toThrow(/supervision unfinished/)
  })
  it('requires the closure artifact for the exact report, not a prior green run', () => {
    const report = quiet()
    expect(() => validateSurveyorSupervisionCompletion({ ...report, checkedAt: '2026-10-02T12:00:00Z' }, closed(report))).toThrow(/checkedAt does not match/)
  })
  it('requires exact Atlanta exhibitor feed coverage in real cloud reports', () => {
    const coverage = { status: 'complete', configuredCount: 1, checkedCount: 1, sources: [{ id: 'atlanta-experience-exhibitors', eventId: '21389', eventSlug: 'htwhdatl26shdl10', categoryId: '20590', count: 65, rosterHash: 'a'.repeat(64) }] }
    const report = { ...quiet(), sourceCount: 50, exhibitorDirectoryCoverage: coverage }
    expect(validateSurveyorSupervisionCompletion(report, closed(report)).status).toBe('complete')
    for (const exhibitorDirectoryCoverage of [undefined, { ...coverage, checkedCount: 0 }, { ...coverage, configuredCount: 0 }, { ...coverage, sources: [{ ...coverage.sources[0], eventId: 'wrong' }] }, { ...coverage, sources: [{ ...coverage.sources[0], count: 0 }] }]) {
      const invalid = { ...report, exhibitorDirectoryCoverage }
      expect(() => validateSurveyorSupervisionCompletion(invalid, closed(invalid))).toThrow(/exhibitor directory coverage/)
    }
  })
})
