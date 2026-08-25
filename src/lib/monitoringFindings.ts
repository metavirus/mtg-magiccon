export type MonitoringFindingStatus = 'unread' | 'read' | 'archived' | 'needs_review' | 'deferred' | 'authorized' | 'staged' | 'completed' | 'dismissed'
export type MonitoringFindingDecision = 'yes' | 'no'
export type MonitoringExecutionStatus = 'not_started' | 'queued' | 'executing' | 'completed' | 'failed' | 'blocked'
export type MonitoringOfficialResource = { label: string; url: string }
export type MonitoringFindingChoice = { choice_key: string; label: string; value: string }

export type MonitoringConceptRow = {
  concept_key: string
  title: string
  current_summary: string
  attention_state: string
  review_state: 'unread' | 'read' | 'archived'
  latest_resolution: string | null
  current_state: Record<string, unknown>
  evidence_count: number
  first_seen_at: string
  last_seen_at: string
  created_at?: string
  updated_at?: string
}

export function monitoringConceptResources(concept: MonitoringConceptRow): MonitoringOfficialResource[] {
  const candidates = [concept.current_state.resources, concept.current_state.provenance]
    .filter(Array.isArray)
    .flat()
  const seen = new Set<string>()
  return candidates.flatMap(candidate => {
    if (!candidate || typeof candidate !== 'object') return []
    const value = candidate as Record<string, unknown>
    const label = typeof value.label === 'string' ? value.label.trim() : ''
    const url = typeof value.url === 'string' ? value.url : typeof value.source_url === 'string' ? value.source_url : ''
    if (!label || !url) return []
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'https:' || seen.has(parsed.toString())) return []
      seen.add(parsed.toString())
      return [{ label, url: parsed.toString() }]
    } catch {
      return []
    }
  })
}

export function coalesceMonitoringConcepts<T extends { conceptKey?: string | null }>(conceptItems: T[], legacyItems: T[]) {
  const canonicalKeys = new Set(conceptItems.map(item => item.conceptKey?.trim()).filter((key): key is string => Boolean(key)))
  return [...conceptItems, ...legacyItems.filter(item => {
    const key = item.conceptKey?.trim()
    return !key || !canonicalKeys.has(key)
  })]
}

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
  selected_choice_key?: string | null
}

export function findingChoices(finding: MonitoringFindingRow): MonitoringFindingChoice[] {
  const choices = finding.action_payload?.choice_options
  if (!Array.isArray(choices) || choices.length !== 2) return []
  const normalized = choices.flatMap(choice => {
    if (!choice || typeof choice !== 'object') return []
    const value = choice as Record<string, unknown>
    const choice_key = typeof value.choice_key === 'string' ? value.choice_key.trim() : ''
    const label = typeof value.label === 'string' ? value.label.trim() : ''
    const choiceValue = typeof value.value === 'string' ? value.value.trim() : ''
    return choice_key && label && choiceValue ? [{ choice_key, label, value: choiceValue }] : []
  })
  return normalized.length === 2 && normalized[0].choice_key !== normalized[1].choice_key ? normalized : []
}

export function findingIsChoiceResolution(finding: MonitoringFindingRow) {
  return finding.action_type === 'resolve_info_topic_article_fact_conflict'
    && findingChoices(finding).length === 2
    && finding.action_payload?.target_kind === 'info_topic_article_fact'
    && typeof finding.action_payload?.topic_key === 'string'
    && typeof finding.action_payload?.section_key === 'string'
    && typeof finding.action_payload?.fact_label === 'string'
}

export function monitoringDecisionPatch(decision: MonitoringFindingDecision, userId: string, finding?: MonitoringFindingRow, now = new Date().toISOString()) {
  if (decision === 'yes') {
    if (!finding || !findingCanAuthorize(finding)) throw new Error('This finding needs a bounded canonical action mapping before it can be approved.')
    return { status: 'authorized' as const, decision, decided_by: userId, decided_at: now, staged_at: null, action_type: finding.action_type, action_payload: finding.action_payload, rollback_payload: finding.rollback_payload, execution_status: 'queued' as const, blocker: null, error_message: null, updated_at: now }
  }
  return { status: 'dismissed' as const, decision, decided_by: userId, decided_at: now, staged_at: null, execution_status: 'not_started' as const, updated_at: now }
}

export function findingReviewLabel(finding: MonitoringFindingRow) {
  if (finding.status === 'unread') return 'new'
  if (finding.status === 'read') return 'read'
  if (finding.status === 'archived') return 'archived'
  if (finding.status === 'deferred') return 'deferred'
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
  return !findingIsInformational(finding) && Boolean(finding.action_type && finding.action_payload && finding.rollback_payload)
}

export function monitoringDeferPatch(now = new Date().toISOString()) {
  return { status: 'deferred' as const, decision: null, decided_by: null, decided_at: null, staged_at: null, execution_status: 'not_started' as const, updated_at: now }
}

export function findingIsInformational(finding: MonitoringFindingRow) {
  return ['unread', 'read', 'archived'].includes(finding.status)
    || findingOfficialResources(finding).length > 0
    || finding.action_payload?.canonical_fact_mutation === false
    || finding.action_type === 'publish_official_links_alert'
}

export function findingOfficialResources(finding: MonitoringFindingRow): MonitoringOfficialResource[] {
  const evidenceLinks = finding.evidence.presentation_links
  const linkDelta = finding.evidence.link_delta ?? finding.evidence.linkDelta
  const deltaAdded = linkDelta && typeof linkDelta === 'object' && 'added' in linkDelta ? (linkDelta as { added?: unknown }).added : []
  const candidates = Array.isArray(evidenceLinks)
    ? evidenceLinks
    : Array.isArray(deltaAdded) && deltaAdded.length > 0
      ? deltaAdded
      : Array.isArray(finding.action_payload?.links) ? finding.action_payload.links : []
  return candidates.flatMap(link => {
    if (typeof link === 'string') {
      const separator = link.lastIndexOf(' -> ')
      if (separator < 1) return []
      link = { label: link.slice(0, separator), url: link.slice(separator + 4) }
    }
    if (!link || typeof link !== 'object') return []
    const { label, url } = link as { label?: unknown; url?: unknown }
    if (typeof label !== 'string' || !label.trim() || typeof url !== 'string') return []
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' ? [{ label: label.trim(), url: parsed.toString() }] : []
    } catch {
      return []
    }
  })
}

export function findingDisplaySummary(finding: MonitoringFindingRow) {
  if (findingIsInformational(finding) && findingOfficialResources(finding).length > 0) {
    return 'Official Atlanta navigation now links to useful Magic Play resources.'
  }
  return finding.summary
}

export function findingNeedsKaviAction(finding: MonitoringFindingRow) {
  if (!findingCanAuthorize(finding)) return false
  if (finding.status === 'needs_review') return (finding.execution_status ?? 'not_started') === 'not_started'
  return finding.status === 'authorized' && ['failed', 'blocked'].includes(finding.execution_status ?? '')
}

export function findingIsHomeWorthy(finding: MonitoringFindingRow) {
  if (findingNeedsKaviAction(finding)) return true
  return ['unread', 'needs_review'].includes(finding.status) && findingIsInformational(finding) && findingOfficialResources(finding).length > 0
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
