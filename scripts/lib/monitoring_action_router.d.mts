export type MonitoringFindingClassification = {
  classification: 'informational_official_links' | 'requires_mapping'
  finding_status: 'unread' | 'needs_review'
  action_type: null
  execution_status: 'not_started'
  review_actions: Array<'mark_read' | 'archive'>
  reason: string | null
  finding_fingerprint: string | null
  presentation?: Record<string, any>
}
export function classifyMonitoringFinding(finding: Record<string, any>): MonitoringFindingClassification
export const routeMonitoringFinding: typeof classifyMonitoringFinding
