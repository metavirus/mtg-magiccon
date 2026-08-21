export type MonitoringActionPlan = {
  action_type: 'publish_official_links_alert' | 'blocked'
  action_payload: Record<string, unknown> | null
  action_fingerprint?: string
  execution_status: 'not_started' | 'queued' | 'executing' | 'completed' | 'failed' | 'blocked'
  canonical_target: Record<string, unknown> | null
  blocker: string | null
  retryable: boolean
  finding_fingerprint: string | null
  rollback_payload?: Record<string, unknown>
  error_message?: string
  canonical_result?: unknown
  executed_at?: string
  deployment_evidence?: unknown
  verification_evidence?: unknown
}

export const monitoringActionTypes: Readonly<{
  PUBLISH_OFFICIAL_LINKS_ALERT: 'publish_official_links_alert'
  BLOCKED: 'blocked'
}>

export function routeMonitoringFinding(finding: Record<string, any>): MonitoringActionPlan

export function executeMonitoringAction(
  plan: MonitoringActionPlan,
  publisher?: (request: {
    idempotencyKey: string
    target: Record<string, unknown>
    payload: Record<string, unknown>
  }) => Promise<Record<string, any>>,
): Promise<MonitoringActionPlan>
