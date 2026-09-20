import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { sourceOnboardingReview } from './monitoring_source_onboarding.mjs'
import { pageContentFingerprint } from './monitoring_page_fingerprint.mjs'
import { buildMonitoringCandidateRows } from './build_monitoring_candidates.mjs'
import { editorialAllowsFactExtraction } from './surveyor_editorial.mjs'
import { acceptClosedPublicWatchChanges } from './monitoring_baseline_acceptance.mjs'
const url = 'https://mcatlanta.mtgfestivals.com/en-us/experience/meet-and-greets.html'
const snapshot = (html: string) => ({ status: 200, ...pageContentFingerprint(html, url) })
const original = snapshot('<main>Meet and Greet Schedule. Wristband information: <a href="https://mcamsterdam.mtgfestivals.com/en-us/info.html">information page</a></main>')
const source = { id: 'atlanta-meet-and-greets', label: 'Atlanta Meet and Greets', url, initialReview: { reviewedAt: '2026-09-19', contentHash: original.contentHash, contentLinkHash: original.contentLinkHash, disposition: 'noise', reason: 'Amsterdam wristband link is not verified Atlanta policy.' } }
const makeReport = (current: typeof original) => ({ checkedAt: '2026-09-20T03:00:00Z', changes: [{ ...source, current: { ...current, textSample: current.contentSample, textHash: current.contentHash }, previous: null, initialSourceReview: true, reviewedEditorial: sourceOnboardingReview(source, current), linkDelta: { added: [], removed: [] } }] })
describe('source onboarding through exact cloud closure', () => {
  it('matches real September 19 official snapshots to their explicit watch-set reviews', () => {
    const fixtures = JSON.parse(readFileSync('scripts/fixtures/monitoring-source-onboarding.json', 'utf8'))
    const watch = JSON.parse(readFileSync('monitoring/watch-set.json', 'utf8'))
    for (const current of fixtures) {
      const configured = watch.sources.find((item: { url: string }) => item.url === current.url)
      expect(configured).toBeDefined()
      expect(sourceOnboardingReview(configured, current)?.disposition).toBe('noise')
      expect(sourceOnboardingReview(configured, { ...current, contentHash: 'different-published-content' })).toBeNull()
    }
  })
  it('retains copied initial content as reviewed evidence without inventing an announcement or fact', () => {
    const [row] = buildMonitoringCandidateRows(makeReport(original))
    expect(row.evidence.editorial.disposition).toBe('noise')
    expect(editorialAllowsFactExtraction(row.evidence)).toBe(false)
  })
  it.each([
    '<main>Meet and Greet Schedule. New Atlanta guests will appear Saturday.</main>',
    '<main>Meet and Greet Schedule. Wristband information: <a href="https://mcatlanta.mtgfestivals.com/en-us/info.html">information page</a></main>',
  ])('holds changed content or links after review for editorial judgment', html => {
    const [row] = buildMonitoringCandidateRows(makeReport(snapshot(html)))
    expect(row.evidence.editorial.disposition).toBe('pending')
    expect(editorialAllowsFactExtraction(row.evidence)).toBe(false)
    expect(row.status).toBe('needs_review')
  })
  it('accepts a first snapshot only from the exact pending cloud report', () => {
    const report = makeReport(original)
    const state = { checkedAt: report.checkedAt, accepted: {}, pending: { [source.id]: { ...original, detectedAt: report.checkedAt } } }
    const manifest = { catches: [{ sourceId: source.id, intakeKind: 'public_watch' }] }
    expect(acceptClosedPublicWatchChanges(report, manifest, state).acceptedSourceIds).toEqual([source.id])
    expect(() => acceptClosedPublicWatchChanges(report, manifest, { ...state, pending: {} })).toThrow(/exact pending/)
  })
  it('does not silently accept new watch sources in the runtime', () => {
    const runtime = readFileSync('scripts/monitoring_watch_check.mjs', 'utf8')
    expect(runtime).not.toContain('if (!previous || accept)')
    expect(runtime).toContain('initialSourceReview: !previous')
    expect(runtime).toContain('sourceOnboardingReview(source, current)')
  })
})
