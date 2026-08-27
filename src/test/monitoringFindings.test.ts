import { describe, expect, it } from 'vitest'
import { coalesceMonitoringConcepts, findingApprovalLabel, findingCanAuthorize, findingChoices, findingDisplaySummary, findingExecutionDetail, findingIsChoiceResolution, findingIsHomeWorthy, findingMayBypassConceptReadModel, findingOfficialResources, findingReviewLabel, monitoringConceptIsHomeWorthy, monitoringConceptIsUserFacing, monitoringConceptResources, monitoringDecisionPatch, monitoringDeferPatch, type MonitoringFindingRow } from '../lib/monitoringFindings'

const finding = (overrides: Partial<MonitoringFindingRow> = {}): MonitoringFindingRow => ({
  id: 'finding', fingerprint: 'a'.repeat(64), source_id: 'source', source_label: 'Official source', source_url: 'https://example.com/very/long/source/url', destination: 'Home', title: 'New official links', summary: 'Summary', review_question: 'Add the links?', evidence: {}, status: 'needs_review', decision: null, first_seen_at: '2026-08-21T20:00:00.000Z', last_seen_at: '2026-08-21T20:00:00.000Z', occurrence_count: 1, decided_by: null, decided_at: null, staged_at: null, ...overrides,
})

describe('monitoring finding decisions', () => {
  it('renders a canonical concept once and leaves missing keys fail-safe', () => {
    const canonical = [{ id: 'concept', conceptKey: 'ticketed-play-sale' }]
    const legacy = [
      { id: 'duplicate', conceptKey: 'ticketed-play-sale' },
      { id: 'unrelated', conceptKey: 'map-release' },
      { id: 'unkeyed' },
    ]
    expect(coalesceMonitoringConcepts(canonical, legacy).map(item => item.id)).toEqual(['concept', 'unrelated', 'unkeyed'])
  })

  it('deduplicates concept provenance by URL', () => {
    expect(monitoringConceptResources({
      concept_key: 'ticketed-play-sale', title: 'Ticketed Play', current_summary: 'Sale timing is published.', attention_state: 'informational', review_state: 'unread', latest_resolution: null,
      current_state: { resources: [{ label: 'Schedule', url: 'https://example.com/schedule' }], provenance: [{ label: 'Same source', source_url: 'https://example.com/schedule' }, { label: 'FAQ', source_url: 'https://example.com/faq' }] },
      evidence_count: 2, first_seen_at: '2026-08-21T00:00:00Z', last_seen_at: '2026-08-21T01:00:00Z',
    })).toEqual([{ label: 'Schedule', url: 'https://example.com/schedule' }, { label: 'FAQ', url: 'https://example.com/faq' }])
  })
  it('authorizes and queues a named bounded action', () => {
    const mapped = finding({ action_type: 'update_event', action_payload: { event_id: 'event-1' }, rollback_payload: { operation: 'restore_event' } })
    expect(monitoringDecisionPatch('yes', 'kavi-id', mapped, '2026-08-21T20:00:00.000Z')).toMatchObject({
      status: 'authorized', decision: 'yes', decided_by: 'kavi-id', decided_at: '2026-08-21T20:00:00.000Z', staged_at: null, execution_status: 'queued', action_type: 'update_event',
    })
  })

  it('dismisses no and leaves staged_at empty', () => {
    expect(monitoringDecisionPatch('no', 'kavi-id', undefined, '2026-08-21T20:00:00.000Z')).toMatchObject({ status: 'dismissed', decision: 'no', staged_at: null, execution_status: 'not_started' })
  })

  it('exposes exactly two concrete server-authored factual choices', () => {
    const conflict = finding({
      action_type: 'resolve_info_topic_article_fact_conflict',
      action_payload: { target_kind: 'info_topic_article_fact', topic_key: 'on-demand-play', section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', choice_options: [
        { choice_key: 'newsletter', label: 'Use 10 AM–4 PM', value: '10 AM–4 PM' },
        { choice_key: 'maintained', label: 'Keep 10 AM–3 PM', value: '10 AM–3 PM' },
      ] },
      rollback_payload: { operation: 'restore_info_topic_article_fact', topic_key: 'on-demand-play', section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', value: '10 AM–3 PM' },
    })
    expect(findingIsChoiceResolution(conflict)).toBe(true)
    expect(findingChoices(conflict).map(choice => choice.label)).toEqual(['Use 10 AM–4 PM', 'Keep 10 AM–3 PM'])
  })

  it('treats not now as defer without recording a factual decision', () => {
    expect(monitoringDeferPatch('2026-08-24T20:00:00.000Z')).toEqual({
      status: 'deferred', decision: null, decided_by: null, decided_at: null, staged_at: null,
      execution_status: 'not_started', updated_at: '2026-08-24T20:00:00.000Z',
    })
  })

  it('rejects malformed or duplicate choice mappings', () => {
    const malformed = finding({ action_type: 'resolve_info_topic_article_fact_conflict', action_payload: {
      target_kind: 'info_topic_article_fact', topic_key: 'on-demand-play', section_key: 'registration-hours', fact_label: 'Constructed & Draft · Sun', choice_options: [
        { choice_key: 'same', label: 'Use newer value', value: 'new' }, { choice_key: 'same', label: 'Keep current value', value: 'current' },
      ],
    } })
    expect(findingChoices(malformed)).toEqual([])
    expect(findingIsChoiceResolution(malformed)).toBe(false)
  })

  it('names the authorized consequence instead of offering a generic yes', () => {
    expect(findingApprovalLabel(finding({ action_type: 'add_official_links' }))).toBe('Add these official links')
    expect(findingApprovalLabel(finding({ action_payload: { approval_label: 'Update this event' } }))).toBe('Update this event')
  })

  it('does not authorize an unmapped action', () => {
    expect(findingCanAuthorize(finding())).toBe(false)
    expect(() => monitoringDecisionPatch('yes', 'kavi-id', finding())).toThrow(/bounded canonical action mapping/)
  })

  it('keeps an unread link-only Activity finding off Home', () => {
    const informationalActivityFinding = finding({
      destination: 'Activity',
      status: 'unread',
      evidence: { presentation_links: [{ label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html' }] },
      execution_status: 'not_started',
    })
    expect(findingIsHomeWorthy(informationalActivityFinding)).toBe(false)
    expect(findingCanAuthorize(informationalActivityFinding)).toBe(false)
    expect(() => monitoringDecisionPatch('yes', 'kavi-id', informationalActivityFinding)).toThrow(/canonical action/)
  })

  it('keeps generic updates and legacy resource concepts off Home and out of user-facing Activity', () => {
    const base = {
      title: 'Concept', current_summary: 'Summary', review_state: 'unread' as const, latest_resolution: 'material_update',
      current_state: {}, evidence_count: 1, first_seen_at: '2026-08-25T00:00:00Z', last_seen_at: '2026-08-25T00:00:00Z',
    }
    expect(monitoringConceptIsHomeWorthy({ ...base, concept_key: 'real-fact', concept_kind: 'info_article_fact', attention_state: 'material_update' })).toBe(false)
    const legacy = { ...base, concept_key: 'atlanta:magic-play:official-resources-available', concept_kind: 'official_resource_availability', attention_state: 'material_update' }
    expect(monitoringConceptIsUserFacing(legacy)).toBe(false)
    expect(monitoringConceptIsHomeWorthy(legacy)).toBe(false)
    expect(monitoringConceptIsHomeWorthy({ ...base, concept_key: 'flight', concept_kind: 'flight_schedule', attention_state: 'material_update' })).toBe(true)
    expect(monitoringConceptIsHomeWorthy({ ...base, concept_key: 'sale', concept_kind: 'ticketed_play_sales', attention_state: 'material_update' })).toBe(true)
    expect(monitoringConceptIsHomeWorthy({ ...base, concept_key: 'deadline', attention_state: 'milestone_transition' })).toBe(true)
    expect(monitoringConceptIsHomeWorthy({ ...base, concept_key: 'conflict', attention_state: 'contradiction' })).toBe(true)
  })

  it('does not promote unmapped or resolved Activity findings to Home attention', () => {
    expect(findingIsHomeWorthy(finding({ destination: 'Activity' }))).toBe(false)
    expect(findingIsHomeWorthy(finding({
      destination: 'Activity', status: 'completed', decision: 'yes', action_type: 'publish_official_links_alert', action_payload: { links: [] }, rollback_payload: { operation: 'remove' }, execution_status: 'completed',
    }))).toBe(false)
  })

  it('keeps raw unmapped Home deltas behind the concept read model', () => {
    expect(findingMayBypassConceptReadModel(finding({
      destination: 'Home',
      title: 'Ticketed Play sales milestone changed',
      summary: 'Page text or shared navigation changed; inspect the captured source evidence before deciding.',
    }))).toBe(false)
    expect(findingMayBypassConceptReadModel(finding({
      destination: 'Home',
      evidence: { intake_kind: 'ticketed_play_inventory' },
    }))).toBe(true)
    expect(findingMayBypassConceptReadModel(finding({ destination: 'Inbox' }))).toBe(true)
  })

  it('returns only concise labeled HTTPS official resources', () => {
    const resources = findingOfficialResources(finding({ evidence: { presentation_links: [
      { label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html' },
      { label: '', url: 'https://example.com/raw' },
      { label: 'Unsafe', url: 'javascript:alert(1)' },
    ] } }))
    expect(resources).toEqual([{ label: 'Ticketed Play Schedule', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/ticketed-play.html' }])
  })

  it('replaces a machine-generated link delta with useful informational copy', () => {
    const informational = finding({
      status: 'unread',
      summary: '7 links added: Magic Play -> https://mcatlanta.mtgfestivals.com/en-us/magic-play.html',
      evidence: { presentation_links: [{ label: 'Magic Play', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play.html' }] },
    })
    expect(findingDisplaySummary(informational)).toBe('Official Atlanta navigation now links to useful Magic Play resources.')
    expect(findingDisplaySummary(informational)).not.toContain('https://')
  })

  it('makes active and terminal execution states explicit', () => {
    expect(findingReviewLabel(finding({ execution_status: 'executing' }))).toBe('executing')
    expect(findingReviewLabel(finding({ execution_status: 'completed' }))).toBe('completed')
    expect(findingExecutionDetail(finding({ execution_status: 'failed', error_message: 'Publish verification failed.' }))).toBe('Publish verification failed.')
    expect(findingExecutionDetail(finding({ execution_status: 'blocked', blocker: 'Target mapping is ambiguous.' }))).toBe('Target mapping is ambiguous.')
  })
})
