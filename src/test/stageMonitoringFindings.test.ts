import { describe, expect, it } from 'vitest'
import { buildMonitoringCandidateRows } from '../../scripts/lib/build_monitoring_candidates.mjs'

describe('monitoring finding action mapping', () => {
  it('assigns a bounded action only to recognized add-only official links', () => {
    const [row] = buildMonitoringCandidateRows({
      checkedAt: '2026-08-21T18:00:00.000Z',
      changes: [{
        id: 'atlanta-official-home', label: 'Atlanta', url: 'https://mcatlanta.mtgfestivals.com/en-us.html', destination: 'Home',
        current: { status: 200 }, previous: { status: 200 },
        linkDelta: { added: ['Prize Wall -> https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html'], removed: [] },
      }],
    })
    expect(row).toMatchObject({
      action_type: 'publish_official_links_alert',
      execution_status: 'not_started',
      review_question: 'Publish these reviewed official links to Activity?',
      canonical_target: { kind: 'activity_reviewed_source_alerts', destination: 'Activity' },
      action_payload: { canonical_fact_mutation: false, approval_label: 'Publish reviewed Activity alert' },
    })
    expect(row).not.toHaveProperty('approval_label')
    const allowedColumns = new Set([
      'fingerprint', 'source_id', 'source_label', 'source_url', 'destination', 'title', 'summary',
      'review_question', 'evidence', 'last_seen_at', 'updated_at', 'action_type', 'action_payload',
      'execution_status', 'canonical_target', 'rollback_payload',
    ])
    expect(Object.keys(row).filter((key) => !allowedColumns.has(key))).toEqual([])
  })

  it('leaves unsupported findings unmapped', () => {
    const [row] = buildMonitoringCandidateRows({
      checkedAt: '2026-08-21T18:00:00.000Z',
      changes: [{ id: 'atlanta-faq', label: 'FAQ', url: 'https://mcatlanta.mtgfestivals.com/faq', destination: 'Activity', current: {}, previous: {}, linkDelta: { added: [], removed: [] } }],
    })
    expect(row.action_type).toBeUndefined()
    expect(row.execution_status).toBeUndefined()
    expect(row.review_question).toBe('Action mapping required before approving this FAQ change.')
  })
})
