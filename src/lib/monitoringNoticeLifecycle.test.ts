import { describe, expect, it } from 'vitest'
import { monitoringNoticeNeedsAction, monitoringNoticeSeverity } from './monitoringNoticeLifecycle'
import type { MonitoringConceptRow, MonitoringFindingRow } from './monitoringFindings'

const now = Date.parse('2026-09-06T12:00:00Z')
const concept: MonitoringConceptRow = {
  concept_key: 'atlanta:trip:flight:example', concept_kind: 'flight_schedule',
  title: 'Atlanta flight changed', current_summary: 'Your Atlanta flight changed.',
  attention_state: 'material_update', review_state: 'unread', latest_resolution: 'material_update',
  current_state: {}, evidence_count: 1, first_seen_at: '2026-08-22T12:00:00Z', last_seen_at: '2026-08-22T12:00:00Z',
}
const finding: MonitoringFindingRow = {
  id: 'action', fingerprint: 'action', source_id: 'official', source_label: 'Official', source_url: 'https://example.com',
  destination: 'Activity', title: 'Resolve a conflict', summary: 'Two sources disagree.', review_question: 'Which value?',
  evidence: {}, status: 'needs_review', decision: null, first_seen_at: concept.first_seen_at, last_seen_at: concept.last_seen_at,
  occurrence_count: 1, decided_by: null, decided_at: null, staged_at: null,
  action_type: 'update_event', action_payload: { event_id: 'event' }, rollback_payload: { operation: 'restore_event' },
}

describe('monitoring notice urgency', () => {
  it('releases the old unread flight update and artist confirmation from Hot without marking either read', () => {
    const flight = { severity: 'hot' as const, checkedAtIso: concept.last_seen_at, monitoringConcept: concept }
    const artist = { severity: 'hot' as const, checkedAtIso: '2026-08-19T19:10:00Z', reviewState: 'needs-review' }
    expect(monitoringNoticeSeverity(flight, now)).toBe('notice')
    expect(monitoringNoticeSeverity(artist, now)).toBe('notice')
    expect(concept.review_state).toBe('unread')
    expect(artist.reviewState).toBe('needs-review')
  })

  it('allows a fresh material update one day of Hot and does not renew on corroboration', () => {
    const fresh = { severity: 'hot' as const, checkedAtIso: '2026-09-06T00:00:00Z', monitoringConcept: { ...concept, last_seen_at: '2026-09-06T00:00:00Z' } }
    expect(monitoringNoticeSeverity(fresh, now)).toBe('hot')
    expect(monitoringNoticeSeverity(fresh, now + 86_400_000)).toBe('notice')
    expect(monitoringNoticeSeverity({ ...fresh, monitoringConcept: { ...fresh.monitoringConcept, latest_resolution: 'corroboration' } }, now)).toBe('notice')
  })

  it('preserves unresolved contradictions, mapped decisions, failed execution, and selected-event Inbox actions', () => {
    const notices = [
      { monitoringConcept: { ...concept, attention_state: 'contradiction' } },
      { monitoringFinding: finding },
      { monitoringFinding: { ...finding, status: 'authorized' as const, execution_status: 'failed' as const } },
      { monitoringFinding: { ...finding, destination: 'Inbox' as const, status: 'unread' as const } },
    ]
    for (const notice of notices) {
      const item = { ...notice, severity: 'hot' as const, checkedAtIso: concept.last_seen_at }
      expect(monitoringNoticeNeedsAction(item)).toBe(true)
      expect(monitoringNoticeSeverity(item, now)).toBe('hot')
    }
  })

  it('never promotes routine sellouts or renews an informational finding from last seen', () => {
    expect(monitoringNoticeSeverity({ severity: 'quiet', checkedAtIso: new Date(now).toISOString() }, now)).toBe('quiet')
    expect(monitoringNoticeSeverity({ severity: 'hot', checkedAtIso: new Date(now).toISOString(), monitoringFinding: { ...finding, status: 'unread', last_seen_at: new Date(now).toISOString() } }, now)).toBe('notice')
  })
})
