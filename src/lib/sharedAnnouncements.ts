import type { MonitoringFindingRow, MonitoringOfficialResource } from './monitoringFindings'

export type SharedAnnouncement = Pick<MonitoringFindingRow, 'id' | 'source_label' | 'source_url' | 'title' | 'summary' | 'first_seen_at' | 'last_seen_at'> & { resources?: MonitoringOfficialResource[] }

// The RPC supplies only reviewed public copy. Never spread a server row into
// the operational finding model: new server columns must not leak into drawers.
export function sharedAnnouncementFinding(row: SharedAnnouncement): MonitoringFindingRow {
  return {
    id: row.id, fingerprint: '', source_id: '', source_label: row.source_label,
    source_url: row.source_url, title: row.title, summary: row.summary,
    first_seen_at: row.first_seen_at, last_seen_at: row.last_seen_at,
    destination: 'Home', status: 'unread', review_question: '',
    evidence: { home_signal_kind: 'interesting_announcement', shared_announcement: true, presentation_links: (row.resources ?? []).map(link => ({ label: link.label, url: link.url })) },
    decision: null, decided_by: null, decided_at: null, staged_at: null, occurrence_count: 1,
  }
}

export async function loadViewerFindings(
  operator: boolean,
  loadOperator: () => Promise<MonitoringFindingRow[]>,
  loadShared: () => Promise<SharedAnnouncement[]>,
): Promise<MonitoringFindingRow[]> {
  return operator ? loadOperator() : (await loadShared()).map(sharedAnnouncementFinding)
}

export function sharedAnnouncementStatus(review?: string): 'unread' | 'read' | 'archived' {
  return review === 'archived' ? 'archived' : review === 'reviewed' ? 'read' : 'unread'
}
