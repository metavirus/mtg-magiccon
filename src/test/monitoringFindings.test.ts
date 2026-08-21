import { describe, expect, it } from 'vitest'
import { findingApprovalLabel, findingCanAuthorize, findingExecutionDetail, findingNeedsKaviAction, findingReviewLabel, monitoringDecisionPatch, type MonitoringFindingRow } from '../lib/monitoringFindings'

const finding = (overrides: Partial<MonitoringFindingRow> = {}): MonitoringFindingRow => ({
  id: 'finding', fingerprint: 'a'.repeat(64), source_id: 'source', source_label: 'Official source', source_url: 'https://example.com/very/long/source/url', destination: 'Home', title: 'New official links', summary: 'Summary', review_question: 'Add the links?', evidence: {}, status: 'needs_review', decision: null, first_seen_at: '2026-08-21T20:00:00.000Z', last_seen_at: '2026-08-21T20:00:00.000Z', occurrence_count: 1, decided_by: null, decided_at: null, staged_at: null, ...overrides,
})

describe('monitoring finding decisions', () => {
  it('authorizes and queues a named bounded action', () => {
    const mapped = finding({ action_type: 'publish_official_links_alert', action_payload: { links: [] }, rollback_payload: { operation: 'remove' } })
    expect(monitoringDecisionPatch('yes', 'kavi-id', mapped, '2026-08-21T20:00:00.000Z')).toMatchObject({
      status: 'authorized', decision: 'yes', decided_by: 'kavi-id', decided_at: '2026-08-21T20:00:00.000Z', staged_at: null, execution_status: 'queued', action_type: 'publish_official_links_alert',
    })
  })

  it('dismisses no and leaves staged_at empty', () => {
    expect(monitoringDecisionPatch('no', 'kavi-id', undefined, '2026-08-21T20:00:00.000Z')).toMatchObject({ status: 'dismissed', decision: 'no', staged_at: null, execution_status: 'not_started' })
  })

  it('names the authorized consequence instead of offering a generic yes', () => {
    expect(findingApprovalLabel(finding({ action_type: 'add_official_links' }))).toBe('Add these official links')
    expect(findingApprovalLabel(finding({ action_payload: { approval_label: 'Update this event' } }))).toBe('Update this event')
  })

  it('does not authorize an unmapped action', () => {
    expect(findingCanAuthorize(finding())).toBe(false)
    expect(() => monitoringDecisionPatch('yes', 'kavi-id', finding())).toThrow(/bounded action mapping/)
  })

  it('promotes an unresolved executable Activity finding to Home attention', () => {
    const executableActivityFinding = finding({
      destination: 'Activity',
      action_type: 'publish_official_links_alert',
      action_payload: { links: [] },
      rollback_payload: { operation: 'remove' },
      execution_status: 'not_started',
    })
    expect(findingNeedsKaviAction(executableActivityFinding)).toBe(true)
  })

  it('does not promote unmapped or resolved Activity findings to Home attention', () => {
    expect(findingNeedsKaviAction(finding({ destination: 'Activity' }))).toBe(false)
    expect(findingNeedsKaviAction(finding({
      destination: 'Activity', status: 'completed', decision: 'yes', action_type: 'publish_official_links_alert', action_payload: { links: [] }, rollback_payload: { operation: 'remove' }, execution_status: 'completed',
    }))).toBe(false)
  })

  it('makes active and terminal execution states explicit', () => {
    expect(findingReviewLabel(finding({ execution_status: 'executing' }))).toBe('executing')
    expect(findingReviewLabel(finding({ execution_status: 'completed' }))).toBe('completed')
    expect(findingExecutionDetail(finding({ execution_status: 'failed', error_message: 'Publish verification failed.' }))).toBe('Publish verification failed.')
    expect(findingExecutionDetail(finding({ execution_status: 'blocked', blocker: 'Target mapping is ambiguous.' }))).toBe('Target mapping is ambiguous.')
  })
})
