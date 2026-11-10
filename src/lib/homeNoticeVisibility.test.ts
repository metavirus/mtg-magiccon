import { describe, expect, it } from 'vitest'
import { homeNoticeVisible } from './homeNoticeVisibility'
import { sharedAnnouncementFinding } from './sharedAnnouncements'
import { announcementIsCurrent } from './monitoringFindings'

const now = Date.parse('2026-11-10T12:00:00Z')
const finding = sharedAnnouncementFinding({ id: 'news', source_label: 'Official', source_url: 'https://mcatlanta.mtgfestivals.com/', title: 'Floor map published', summary: 'See the map.', first_seen_at: '2026-11-05T12:00:00Z', last_seen_at: '2026-11-10T12:00:00Z' })
const news = { title: finding.title, sourceKind: 'monitor', reviewState: 'reviewed', monitoringFinding: finding }
describe('Home notice visibility', () => {
  it('keeps read official news available for the original seven-day window', () => {
    expect(homeNoticeVisible(news)).toBe(true)
    expect(announcementIsCurrent(finding, now)).toBe(true)
    expect(announcementIsCurrent(finding, now + 3 * 86400000)).toBe(false)
  })
  it('respects archive and does not resurface read operational items', () => {
    expect(homeNoticeVisible({ ...news, reviewState: 'archived' })).toBe(false)
    expect(homeNoticeVisible({ ...news, monitoringFinding: undefined })).toBe(false)
  })
  it('omits sellout cards across inventory and older title-based sources', () => {
    expect(homeNoticeVisible({ ...news, reviewState: 'needs-review', monitoringFinding: { ...finding, evidence: { intake_kind: 'ticketed_play_inventory', transition: 'sold_out' } } })).toBe(false)
    expect(homeNoticeVisible({ ...news, title: 'Weekend badges sold out', reviewState: 'needs-review' })).toBe(false)
  })
  it('preserves useful changes and group notes', () => {
    expect(homeNoticeVisible({ ...news, title: 'Wristband pickup moved', reviewState: 'needs-review' })).toBe(true)
    expect(homeNoticeVisible({ ...news, sourceKind: 'note', title: 'Our event sold out', reviewState: 'needs-review', monitoringFinding: undefined })).toBe(true)
  })
})
