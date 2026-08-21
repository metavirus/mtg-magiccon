export type MonitoringFindingStatus = 'needs_review' | 'authorized' | 'staged' | 'completed' | 'dismissed'
export type MonitoringFindingDecision = 'yes' | 'no'
export type MonitoringExecutionStatus = 'not_started' | 'queued' | 'executing' | 'completed' | 'failed' | 'blocked'

export type MonitoringFindingRow = {
  id: string
  fingerprint: string
  source_id: string
  source_label: string
  source_url: string
  destination: 'Home' | 'Activity'
  title: string
  summary: string
  review_question: string
  evidence: Record<string, unknown>
  status: MonitoringFindingStatus
  decision: MonitoringFindingDecision | null
  first_seen_at: string
  last_seen_at: string
  occurrence_count: number
  decided_by: string | null
  decided_at: string | null
  staged_at: string | null
  action_type?: string | null
  action_payload?: Record<string, unknown> | null
  execution_status?: MonitoringExecutionStatus | null
  canonical_target?: Record<string, unknown> | null
  canonical_result?: Record<string, unknown> | null
  blocker?: string | null
  error_message?: string | null
  executed_at?: string | null
  deployment_evidence?: Record<string, unknown> | null
  verification_evidence?: Record<string, unknown> | null
  retry_count?: number | null
  rollback_payload?: Record<string, unknown> | null
}

export function monitoringDecisionPatch(decision: MonitoringFindingDecision, userId: string, finding?: MonitoringFindingRow, now = new Date().toISOString()) {
  if (decision === 'yes') {
    if (!finding?.action_type || !finding.action_payload || !finding.rollback_payload) throw new Error('This finding needs a bounded action mapping before it can be approved.')
    return { status: 'authorized' as const, decision, decided_by: userId, decided_at: now, staged_at: null, action_type: finding.action_type, action_payload: finding.action_payload, rollback_payload: finding.rollback_payload, execution_status: 'queued' as const, blocker: null, error_message: null, updated_at: now }
  }
  return { status: 'dismissed' as const, decision, decided_by: userId, decided_at: now, staged_at: null, execution_status: 'not_started' as const, updated_at: now }
}

export function findingReviewLabel(finding: MonitoringFindingRow) {
  if (finding.execution_status === 'queued') return 'approved · queued'
  if (finding.execution_status === 'executing') return 'executing'
  if (finding.execution_status === 'completed') return 'completed'
  if (finding.execution_status === 'failed') return 'failed'
  if (finding.execution_status === 'blocked') return 'blocked'
  if (finding.status === 'staged') return 'staged for ingestion'
  if (finding.status === 'dismissed') return 'dismissed'
  return 'needs review'
}

export function findingApprovalLabel(finding: MonitoringFindingRow) {
  const explicitLabel = finding.action_payload?.approval_label
  if (typeof explicitLabel === 'string' && explicitLabel.trim()) return explicitLabel.trim()
  const labels: Record<string, string> = {
    add_official_links: 'Add these official links',
    update_event: 'Update this event',
    publish_reviewed_change: 'Publish this reviewed change',
    publish_official_links_alert: 'Publish these reviewed links',
  }
  return finding.action_type ? labels[finding.action_type] ?? 'Approve mapped action' : 'Action mapping required'
}

export function findingCanAuthorize(finding: MonitoringFindingRow) {
  return Boolean(finding.action_type && finding.action_payload && finding.rollback_payload)
}

export function findingNeedsKaviAction(finding: MonitoringFindingRow) {
  if (!findingCanAuthorize(finding)) return false
  if (finding.status === 'needs_review') return (finding.execution_status ?? 'not_started') === 'not_started'
  return finding.status === 'authorized' && ['failed', 'blocked'].includes(finding.execution_status ?? '')
}

export function findingExecutionDetail(finding: MonitoringFindingRow) {
  if (finding.execution_status === 'queued') return 'Approved and queued for bounded execution.'
  if (finding.execution_status === 'executing') return 'Applying the approved change and running its checks.'
  if (finding.execution_status === 'completed') return finding.executed_at
    ? `Completed ${new Date(finding.executed_at).toLocaleString()}.`
    : 'The approved change completed.'
  if (finding.execution_status === 'failed') return finding.error_message || 'Execution failed. Review the error before retrying.'
  if (finding.execution_status === 'blocked') return finding.blocker || 'Execution is blocked and needs a concrete next action.'
  if (finding.status === 'dismissed') return 'Dismissed; no canonical change was made.'
  return finding.review_question
}
