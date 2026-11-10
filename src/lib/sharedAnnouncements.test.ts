import { describe, expect, it, vi } from 'vitest'
import { announcementIsCurrent } from './monitoringFindings'
import { loadViewerFindings, sharedAnnouncementFinding, sharedAnnouncementStatus } from './sharedAnnouncements'

const announcement = {
  id: 'news-1', source_label: 'MagicCon', source_url: 'https://mcatlanta.mtgfestivals.com/en-us.html',
  title: 'Floor maps available', summary: 'Find the show floor and lounge maps.',
  first_seen_at: '2026-11-05T12:00:00Z', last_seen_at: '2026-11-10T12:00:00Z',
}

describe('companion public announcements', () => {
  it('loads news for a non-Kavi member without requesting the private queue', async () => {
    const operator = vi.fn()
    const shared = vi.fn().mockResolvedValue([announcement])
    const rows = await loadViewerFindings(false, operator, shared)
    expect(operator).not.toHaveBeenCalled()
    expect(shared).toHaveBeenCalledOnce()
    expect(rows[0]).toMatchObject({ title: announcement.title, status: 'unread', destination: 'Home' })
  })
  it('preserves the operator queue without a duplicate news request', async () => {
    const operatorRows = [{ ...sharedAnnouncementFinding(announcement), status: 'archived' as const }]
    const shared = vi.fn()
    expect(await loadViewerFindings(true, async () => operatorRows, shared)).toBe(operatorRows)
    expect(shared).not.toHaveBeenCalled()
  })
  it('does not copy operational fields even if a response accidentally adds them', () => {
    const row = sharedAnnouncementFinding({ ...announcement, evidence: { secret: 'private' }, rollback_payload: { private: true } } as typeof announcement)
    expect(row.rollback_payload).toBeUndefined()
    expect(row.evidence).toEqual({ home_signal_kind: 'interesting_announcement', shared_announcement: true, presentation_links: [] })
  })
  it('uses each viewer review selection and never renews old news on refresh', () => {
    expect(sharedAnnouncementStatus('archived')).toBe('archived')
    expect(sharedAnnouncementStatus(undefined)).toBe('unread')
    expect(sharedAnnouncementStatus('reviewed')).toBe('read')
    const row = sharedAnnouncementFinding(announcement)
    expect(announcementIsCurrent(row, Date.parse('2026-11-10T12:00:00Z'))).toBe(true)
    expect(announcementIsCurrent(row, Date.parse('2026-11-12T12:00:00Z'))).toBe(false)
  })
})
