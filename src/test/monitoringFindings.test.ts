import { describe, expect, it } from 'vitest'
import { findingApprovalLabel, findingCanAuthorize, findingExecutionDetail, findingIsHomeWorthy, findingOfficialResources, findingReviewLabel, monitoringDecisionPatch, type MonitoringFindingRow } from '../lib/monitoringFindings'

const finding = (overrides: Partial<MonitoringFindingRow> = {}): MonitoringFindingRow => ({
  id: 'finding', fingerprint: 'a'.repeat(64), source_id: 'source', source_label: 'Official source', source_url: 'https://example.com/very/long/source/url', destination: 'Home', title: 'New official links', summary: 'Summary', review_question: 'Add the links?', evidence: {}, status: 'needs_review', decision: null, first_seen_at: '2026-08-21T20:00:00.000Z', last_seen_at: '2026-08-21T20:00:00.000Z', occurrence_count: 1, decided_by: null, decided_at: null, staged_at: null, ...overrides,
})

describe('monitoring finding decisions', () => {
  it('authorizes and queues a named bounded action', () => {
    const mapped = finding({ action_type: 'update_event', action_payload: { event_id: 'event-1' }, rollback_payload: { operation: 'restore_event' } })
    expect(monitoringDecisionPatch('yes', 'kavi-id', mapped, '2026-08-21T20:00:00.000Z')).toMatchObject({
      status: 'authorized', decision: 'yes', decided_by: 'kavi-id', decided_at: '2026-08-21T20:00:00.000Z', staged_at: null, execution_status: 'queued', action_type: 'update_event',
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
    expect(() => monitoringDecisionPatch('yes', 'kavi-id', finding())).toThrow(/bounded canonical action mapping/)
  })

  it('promotes an unread informational Activity finding with useful official links to Home', () => {
    const informationalActivityFinding = finding({
      destination: 'Activity',
      status: 'unread',
      evidence: { presentation_links: [{ label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html' }] },
      execution_status: 'not_started',
    })
    expect(findingIsHomeWorthy(informationalActivityFinding)).toBe(true)
    expect(findingCanAuthorize(informationalActivityFinding)).toBe(false)
    expect(() => monitoringDecisionPatch('yes', 'kavi-id', informationalActivityFinding)).toThrow(/canonical action/)
  })

  it('does not promote unmapped or resolved Activity findings to Home attention', () => {
    expect(findingIsHomeWorthy(finding({ destination: 'Activity' }))).toBe(false)
    expect(findingIsHomeWorthy(finding({
      destination: 'Activity', status: 'completed', decision: 'yes', action_type: 'publish_official_links_alert', action_payload: { links: [] }, rollback_payload: { operation: 'remove' }, execution_status: 'completed',
    }))).toBe(false)
  })

  it('returns only concise labeled HTTPS official resources', () => {
    const resources = findingOfficialResources(finding({ evidence: { presentation_links: [
      { label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html' },
      { label: '', url: 'https://example.com/raw' },
      { label: 'Unsafe', url: 'javascript:alert(1)' },
    ] } }))
    expect(resources).toEqual([{ label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html' }])
  })

  it('makes active and terminal execution states explicit', () => {
    expect(findingReviewLabel(finding({ execution_status: 'executing' }))).toBe('executing')
    expect(findingReviewLabel(finding({ execution_status: 'completed' }))).toBe('completed')
    expect(findingExecutionDetail(finding({ execution_status: 'failed', error_message: 'Publish verification failed.' }))).toBe('Publish verification failed.')
    expect(findingExecutionDetail(finding({ execution_status: 'blocked', blocker: 'Target mapping is ambiguous.' }))).toBe('Target mapping is ambiguous.')
  })
})
