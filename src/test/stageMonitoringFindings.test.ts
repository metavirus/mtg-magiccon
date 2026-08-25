import { describe, expect, it } from 'vitest'
import { buildMonitoringCandidateRows } from '../../scripts/lib/build_monitoring_candidates.mjs'

describe('monitoring finding action mapping', () => {
  it('stages recognized official links as informational evidence', () => {
    const [row] = buildMonitoringCandidateRows({
      checkedAt: '2026-08-21T18:00:00.000Z',
      changes: [{
        id: 'atlanta-official-home', label: 'Atlanta', url: 'https://mcatlanta.mtgfestivals.com/en-us.html', destination: 'Home',
        current: { status: 200 }, previous: { status: 200 },
        linkDelta: { added: ['Prize Wall -> https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html'], removed: [] },
      }],
    })
    expect(row).toMatchObject({
      status: 'unread',
      review_question: 'Mark as read or archive when this source update is no longer useful.',
      evidence: { presentation_links: [{ label: 'Prize Wall', url: 'https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html' }], presentation: { truth_class: 'source_observation', canonical_fact_mutation: false } },
    })
    expect(row).not.toHaveProperty('action_type')
    expect(row).not.toHaveProperty('action_payload')
    expect(row).not.toHaveProperty('approval_label')
    const allowedColumns = new Set([
      'fingerprint', 'source_id', 'source_label', 'source_url', 'destination', 'title', 'summary',
      'review_question', 'evidence', 'last_seen_at', 'updated_at', 'action_type', 'action_payload',
      'status',
    ])
    expect(Object.keys(row).filter((key) => !allowedColumns.has(key))).toEqual([])
  })

  it('leaves unsupported findings unmapped', () => {
    const [row] = buildMonitoringCandidateRows({
      checkedAt: '2026-08-21T18:00:00.000Z',
      changes: [{ id: 'atlanta-faq', label: 'FAQ', url: 'https://mcatlanta.mtgfestivals.com/faq', destination: 'Activity', current: {}, previous: {}, linkDelta: { added: [], removed: [] } }],
    })
    expect(row.action_type).toBeUndefined()
    expect(row.status).toBe('needs_review')
    expect(row.review_question).toBe('Action mapping required before approving this FAQ change.')
  })

  it('gives every row in a mixed bulk-upsert batch an explicit non-null status', () => {
    const rows = buildMonitoringCandidateRows({
      checkedAt: '2026-08-25T17:45:00.000Z',
      changes: [
        { id: 'atlanta-faq', label: 'FAQ', url: 'https://mcatlanta.mtgfestivals.com/en-us/info/faq.html', destination: 'Activity', current: {}, previous: {}, linkDelta: { added: [], removed: [] } },
        { id: 'atlanta-official-home', label: 'Atlanta', url: 'https://mcatlanta.mtgfestivals.com/en-us.html', destination: 'Home', current: { status: 200 }, previous: { status: 200 }, linkDelta: { added: ['Prize Wall -> https://mcatlanta.mtgfestivals.com/en-us/magic-play/prize-wall.html'], removed: [] } },
      ],
    })
    expect(rows.map(row => row.status)).toEqual(['needs_review', 'unread'])
  })
})
