import { homeSignalIsHotNow } from './homeSignalAge'
import { findingNeedsKaviAction, type MonitoringConceptRow, type MonitoringFindingRow } from './monitoringFindings'

type MonitoringNotice = {
  severity: 'hot' | 'notice' | 'quiet'
  checkedAtIso: string
  monitoringConcept?: MonitoringConceptRow
  monitoringFinding?: MonitoringFindingRow
}

export function monitoringNoticeNeedsAction(item: MonitoringNotice) {
  if (item.monitoringConcept?.attention_state === 'contradiction') return true
  const finding = item.monitoringFinding
  return Boolean(finding && (findingNeedsKaviAction(finding)
    || (finding.destination === 'Inbox' && finding.status === 'unread')))
}

export function monitoringNoticeSeverity(item: MonitoringNotice, now = Date.now()): MonitoringNotice['severity'] {
  if (item.severity !== 'hot' || monitoringNoticeNeedsAction(item)) return item.severity
  // Unread is a review preference, not an indefinitely renewed urgency signal.
  // A corroboration only reobserves an existing claim. With no separate material
  // change timestamp in the read model, use its first sighting conservatively.
  const concept = item.monitoringConcept
  const changedAt = concept?.latest_resolution === 'corroboration' ? concept.first_seen_at
    : item.monitoringFinding?.first_seen_at ?? item.checkedAtIso
  return homeSignalIsHotNow(changedAt, now) ? 'hot' : 'notice'
}
