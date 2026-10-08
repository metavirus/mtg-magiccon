import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { EXHIBITOR_EVENT_KEY, exhibitorEnrichment, planExhibitorDirectoryProjection, reviewedExhibitorDirectory, verifyExhibitorDirectoryProjection } from './exhibitor_directory_projection.mjs'
import { parseExhibitorDirectoryFeed } from './exhibitor_directory_feed.mjs'
import { buildMonitoringCandidateRows } from './build_monitoring_candidates.mjs'

const source = JSON.parse(readFileSync('monitoring/watch-set.json', 'utf8')).sources.find((item: { id: string }) => item.id === 'atlanta-experience-exhibitors')
const exhibitors = parseExhibitorDirectoryFeed({ event_id: '21389', event_slug: 'htwhdatl26shdl10', space_orders: [{ id: '1', company: 'Example', description: 'Cards', specials: [{ title: 'Offer', description: 'Original' }], exclusives: true }] }, source.url, source.exhibitorDirectoryFeed)
const rosterHash = createHash('sha256').update(JSON.stringify(exhibitors)).digest('hex')
const directory = { status: 'complete', eventId: '21389', eventSlug: 'htwhdatl26shdl10', categoryId: '20590', count: 1, rosterHash, exhibitors }
const report = { checkedAt: '2026-10-08T00:00:00Z', changes: [{ ...source, current: { status: 200, textHash: 'exact-content', exhibitorDirectory: directory }, linkDelta: { added: [], removed: [] } }] }

describe('reviewed exhibitor canonical projection', () => {
  it('applies reviewed enrichment only to the exact identity and description', () => {
    const record = { ...exhibitors[0], id: '669990', name: 'Card Kingdom', description: 'Card Kingdom is one of the most prominent retailers of Magic: The Gathering in the world. Founded by brothers Damon and John Morris in 1999, the company began as a basement-based card-selling venture and has since expanded into a robust online platform with deep, reliable inventory and first-class customer service. Card Kingdom also operates fan-favorite game stores Mox Boarding House and has a division focused on collectibles called Nostalgium. Card Kingdom will have a variety of community activities and events at the show, and will not be buying or selling cards at the event.' }
    expect(exhibitorEnrichment(record).visitReason).toContain('not buying or selling cards')
    for (const delta of [{ id: '2' }, { name: 'Different company' }, { description: 'We now sell cards.' }]) expect(exhibitorEnrichment({ ...record, ...delta })).toEqual({})
    const existing = { id: record.id, event_key: EXHIBITOR_EVENT_KEY, record: { ...record, aliases: ['Obsolete alias'], visitReason: 'Obsolete reason' }, checked_at: '2026-10-07T00:00:00Z', active: true, source_hash: 'old' }
    const changed = { ...record, description: 'We now sell cards.' }
    const projected = planExhibitorDirectoryProjection({ ...directory, exhibitors: [changed] }, [existing], report.checkedAt)[0].record
    expect(projected.aliases).toBeUndefined()
    expect(projected.visitReason).toBeUndefined()
  })
  it('requires an exact editorial decision and complete current-format evidence', () => {
    const pending = buildMonitoringCandidateRows(report)[0]
    expect(reviewedExhibitorDirectory(pending)).toBeNull()
    const reviewed = buildMonitoringCandidateRows(report, { editorialDecisions: { [pending.fingerprint]: { disposition: 'noise', reason: 'Reviewed source' } } })[0]
    expect(reviewedExhibitorDirectory(reviewed)).toEqual(directory)
    const changedReport = { ...report, changes: [{ ...report.changes[0], current: { ...report.changes[0].current, textHash: 'different-content' } }] }
    expect(reviewedExhibitorDirectory(buildMonitoringCandidateRows(changedReport, { editorialDecisions: { [pending.fingerprint]: { disposition: 'noise', reason: 'Reviewed old source' } } })[0])).toBeNull()
    for (const delta of [{ count: 2 }, { status: 'partial' }, { eventId: 'other' }, { rosterHash: 'wrong' }, { exhibitors: [{ ...exhibitors[0], specials: '[object Object]' }] }]) {
      expect(() => reviewedExhibitorDirectory({ ...reviewed, evidence: { ...reviewed.evidence, current: { exhibitorDirectory: { ...directory, ...delta } } } })).toThrow()
    }
  })
  it('preserves matching editorial context, retires absent rows, and refuses older replay', () => {
    const prior = { id: '1', event_key: EXHIBITOR_EVENT_KEY, record: { ...exhibitors[0], aliases: ['Alias'], visitReason: 'Buy cards' }, source_hash: 'old', checked_at: '2026-10-07T00:00:00Z', active: true }
    const missing = { ...prior, id: '2', record: { ...prior.record, id: '2' } }
    const planned = planExhibitorDirectoryProjection(directory, [prior, missing], report.checkedAt)
    expect(planned[0].record.aliases).toEqual(['Alias'])
    expect(planned[0].record.visitReason).toBe('Buy cards')
    expect(planned[1].active).toBe(false)
    expect(planExhibitorDirectoryProjection({ ...directory, exhibitors: [{ ...exhibitors[0], description: 'Accessories' }] }, [prior], report.checkedAt)[0].record.visitReason).toBeUndefined()
    expect(planExhibitorDirectoryProjection({ ...directory, exhibitors: [{ ...exhibitors[0], name: 'Different' }] }, [prior], report.checkedAt)[0].record.aliases).toBeUndefined()
    expect(() => planExhibitorDirectoryProjection(directory, [prior], '2026-10-06T00:00:00Z')).toThrow('newer')
    expect(verifyExhibitorDirectoryProjection(planned, JSON.parse(JSON.stringify(planned)))).toEqual(planned)
    expect(() => verifyExhibitorDirectoryProjection(planned, planned.slice(0, 1))).toThrow('count')
    expect(() => verifyExhibitorDirectoryProjection(planned, [{ ...planned[0], record: { ...planned[0].record, specials: [] } }, planned[1]])).toThrow('exact readback')
  })
  it('integrates publication after Home routing and before closure', () => {
    const runtime = readFileSync('scripts/stage_monitoring_findings.mjs', 'utf8')
    const start = runtime.indexOf('const projection = await projectReviewedExhibitorDirectory')
    expect(start).toBeGreaterThan(runtime.indexOf('Home read-model verification failed'))
    expect(start).toBeLessThan(runtime.indexOf('const outcomes = new Map()'))
    expect(runtime).toContain('recordCandidateOutcome(candidate.fingerprint, projection)')
  })
})
