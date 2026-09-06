import { describe, expect, it } from 'vitest'
import { buildMonitoringCandidateRows } from './build_monitoring_candidates.mjs'
import { findingIsHomeWorthy, findingMayBypassConceptReadModel, findingDisplaySummary, announcementIsCurrent, type MonitoringFindingRow } from '../../src/lib/monitoringFindings'
import { completeSurveyorClosureManifest } from './surveyor_closure_contract.mjs'

const change = (text: string) => ({ id: 'atlanta-experience', label: 'Atlanta guests', url: 'https://mcatlanta.mtgfestivals.com/en-us/experience.html', current: { textSample: text, textHash: text }, previous: { textSample: 'Guests will be listed later.' }, linkDelta: { added: [], removed: [] } })
const report = (value: object) => ({ checkedAt: '2026-09-06T12:00:00Z', changes: [value] })

describe('discovery to Home editorial contract', () => {
  it.each(['Meet guest Dana at the Friday panel.', 'Black Lotus pickup is now at the west entrance.'])('surfaces changed content without announcement magic words: %s', text => {
    const [row] = buildMonitoringCandidateRows(report(change(text)))
    const actual = { ...row, first_seen_at: '2026-09-06T12:00:00Z' } as MonitoringFindingRow
    expect(findingMayBypassConceptReadModel(actual)).toBe(true)
    expect(findingIsHomeWorthy(actual)).toBe(true)
    expect(findingDisplaySummary(actual)).toBe(text)
    expect(announcementIsCurrent(actual, Date.parse('2026-09-13T12:00:00Z'))).toBe(false)
  })
  it('surfaces a new map PDF as a resource, with the actual link', () => {
    const [row] = buildMonitoringCandidateRows(report({ ...change(''), linkDelta: { added: ['Atlanta floor map -> https://mcatlanta.mtgfestivals.com/content/map.pdf'], removed: [] } }))
    expect(row.destination).toBe('Home')
    expect(row.evidence.presentation_links[0].url).toContain('map.pdf')
    expect(findingDisplaySummary(row as MonitoringFindingRow)).toContain('Atlanta floor map')
  })
  it('holds unfamiliar material for agent interpretation and accepts a fingerprint-specific decision', () => {
    const input = report(change('A new surprise awaits on Saturday.'))
    const [row] = buildMonitoringCandidateRows(input)
    expect(row.evidence.editorial.disposition).toBe('pending')
    expect(row.status).not.toBe('archived')
    const [resolved] = buildMonitoringCandidateRows(input, { editorialDecisions: { [row.fingerprint]: { disposition: 'home', title: 'Saturday update', summary: 'The official site teases a Saturday surprise; details are pending.', reason: 'Reviewed the exact official passage; useful teaser, no invented details.' } } })
    expect(resolved.destination).toBe('Home')
    expect(resolved.evidence.editorial.reviewed).toBe(true)
  })
  it('rejects stored-only proof for a promised Home announcement', () => {
    const input = report(change('A guest joins Friday.'))
    const outcome = { disposition: 'routed_signal', targets: [{ kind: 'home', identifier: 'x' }], readbacks: [{ system: 'supabase', relation: 'monitoring_findings', match: { id: 'x' }, observed: { id: 'x', evidence: { home_signal_kind: 'interesting_announcement' } } }], rationale: 'Stored only' }
    expect(() => completeSurveyorClosureManifest(input, new Map([['0:atlanta-experience', outcome]]))).toThrow(/Home announcement lacks/)
    expect(() => completeSurveyorClosureManifest(input, new Map([['0:atlanta-experience', { ...outcome, disposition: 'pending_editorial' }]]))).toThrow(/blocked/)
  })
})
