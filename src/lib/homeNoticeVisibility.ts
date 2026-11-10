import { findingIsRoutineSellout, type MonitoringFindingRow } from './monitoringFindings'

// Reading useful news should not remove it from the week's browseable briefing.
// Archiving is still an explicit dismissal. Availability history stays in Activity.
export function homeNoticeVisible(item: {
  title: string
  sourceKind: string
  reviewState: string
  monitoringFinding?: MonitoringFindingRow
}) {
  if (item.reviewState === 'archived') return false
  if (item.monitoringFinding && findingIsRoutineSellout(item.monitoringFinding)) return false
  if (item.sourceKind !== 'note' && /\bsold[\s-]+out\b/i.test(item.title)) return false
  return item.reviewState === 'needs-review'
    || (item.reviewState === 'reviewed' && item.monitoringFinding?.evidence.home_signal_kind === 'interesting_announcement')
}
