import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import { planAnnouncementContentContinuity } from './announcement_content_continuity.mjs'

const row = (id: string, extra = {}) => ({ id, source_id: 'family', destination: 'Home', fingerprint: id, status: 'unread', first_seen_at: id === 'old' ? '2026-09-30T00:00:00Z' : '2026-10-01T00:00:00Z', evidence: { home_signal_kind: 'interesting_announcement', current: { contentHash: 'same', textHash: id } }, ...extra })
describe('exact substantive announcement continuity', () => {
  it('runs cloud repair even on quiet reports and before Home closure', () => {
    const source = fs.readFileSync('scripts/stage_monitoring_findings.mjs', 'utf8')
    expect(source.indexOf('await reconcileAnnouncementContentContinuity()')).toBeLessThan(source.indexOf('if (!changes.length)'))
    const homeSection = source.slice(source.indexOf('// Home routing is a separate consequence'))
    expect(homeSection.indexOf('await reconcileAnnouncementContentContinuity()')).toBeLessThan(homeSection.indexOf('for (const row of candidateRows.filter'))
    expect(source).toContain('if (supersededBy) row.evidence = { ...row.evidence, announcement_superseded_by: supersededBy }')
  })
  it('archives navigation-only duplicate without rewriting oldest age', () => {
    expect(planAnnouncementContentContinuity([row('new'), row('old')])).toEqual([{ id: 'new', status: 'archived', evidence: { ...row('new').evidence, announcement_superseded_by: 'old' } }])
  })
  it.each(['read', 'archived'])('preserves user %s choice across fingerprints', status => {
    const writes = planAnnouncementContentContinuity([row('old'), row('new', { status })])
    expect(writes.find(write => write.id === 'old')?.status).toBe(status)
  })
  it('does not inherit automatic duplicate archive as a user choice', () => {
    expect(planAnnouncementContentContinuity([row('old'), row('new', { status: 'archived', evidence: { ...row('new').evidence, announcement_superseded_by: 'old' } })])).toEqual([])
  })
  it.each([
    { source_id: 'different' },
    { evidence: { ...row('new').evidence, current: { contentHash: 'changed' } } },
    { evidence: { ...row('new').evidence, current: { contentHash: 'same', gatheringGrounds: { scheduleHash: 'new-feed' } } } },
    { evidence: { ...row('new').evidence, current: {} } },
  ])('does not collapse different source, substantive content, feed or missing hash: %j', extra => {
    expect(planAnnouncementContentContinuity([row('old'), row('new', extra)])).toEqual([])
  })
})
