import { createHash } from 'node:crypto'

const OFFICIAL_HOSTS = new Set(['mcatlanta.mtgfestivals.com', 'www.mtgfestivals.com', 'mtgfestivals.com'])
const MAGIC_PLAY_PATH = /\/(magic-play|ticketed-play|prize-tix|prize-wall|play-guide|on-demand)(?:[/.#?-]|$)/i

export const monitoringActionTypes = Object.freeze({
  PUBLISH_OFFICIAL_LINKS_ALERT: 'publish_official_links_alert',
  BLOCKED: 'blocked',
})

function stable(value) {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
  }
  return value
}

function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex')
}

function block(finding, blocker) {
  return {
    action_type: monitoringActionTypes.BLOCKED,
    action_payload: null,
    execution_status: 'blocked',
    canonical_target: null,
    blocker,
    retryable: false,
    finding_fingerprint: finding?.fingerprint ?? null,
  }
}

function parseLinkRecord(record) {
  if (typeof record !== 'string') return null
  const separator = record.lastIndexOf(' -> ')
  const rawUrl = separator >= 0 ? record.slice(separator + 4) : record
  try {
    const url = new URL(rawUrl)
    if (url.protocol !== 'https:' || !OFFICIAL_HOSTS.has(url.hostname.toLowerCase())) return null
    url.hash = ''
    return { label: separator >= 0 ? record.slice(0, separator).trim() : '', url: url.toString() }
  } catch {
    return null
  }
}

export function routeMonitoringFinding(finding) {
  if (!finding || typeof finding !== 'object') return block(finding, 'Finding payload is unavailable.')
  if (finding.status !== 'authorized' || finding.decision !== 'yes') {
    return block(finding, 'A recorded Kavi approval is required before execution.')
  }
  if (!/^[a-f0-9]{64}$/i.test(finding.fingerprint ?? '')) {
    return block(finding, 'Finding fingerprint is missing or invalid.')
  }

  const evidence = finding.evidence
  const delta = evidence?.linkDelta ?? evidence?.link_delta
  const added = Array.isArray(delta?.added) ? delta.added : []
  const removed = Array.isArray(delta?.removed) ? delta.removed : []
  const rawSourceIds = evidence?.sourceIds ?? evidence?.source_ids
  const sourceIds = Array.isArray(rawSourceIds) ? [...new Set(rawSourceIds)].sort() : []
  const observedAt = evidence?.monitorCheckedAt ?? evidence?.monitor_checked_at
  if (!observedAt || !sourceIds.length || !added.length) {
    return block(finding, 'Complete source IDs, retrieval time, and added-link evidence are required.')
  }
  if (removed.length || delta?.truncated) {
    return block(finding, 'Removed or truncated link evidence requires manual interpretation.')
  }

  const links = added.map(parseLinkRecord)
  if (links.some((link) => !link)) {
    return block(finding, 'Every published link must be HTTPS on an allowlisted first-party MagicCon host.')
  }
  const relevantLinks = [...new Map(
    links
      .filter((link) => MAGIC_PLAY_PATH.test(new URL(link.url).pathname))
      .map((link) => [`${link.label}\n${link.url}`, link]),
  ).values()].sort((a, b) => `${a.label}\n${a.url}`.localeCompare(`${b.label}\n${b.url}`))
  if (!relevantLinks.length) {
    return block(finding, 'No allowlisted Magic Play link class was found.')
  }
  const actionPayload = {
    kind: 'official_links_published',
    destination: 'Activity',
    title: 'Atlanta pages now expose Magic Play links',
    summary: 'Official Atlanta navigation now links to Magic Play resources. Review the linked publisher pages for schedules, on-demand play, and Prize Tix details.',
    source: {
      owner: 'MagicCon / ReedPop',
      source_ids: sourceIds,
      observed_at: observedAt,
      finding_fingerprint: finding.fingerprint,
    },
    links: relevantLinks,
    truth_class: 'reviewed_source_observation',
    canonical_fact_mutation: false,
  }

  return {
    action_type: monitoringActionTypes.PUBLISH_OFFICIAL_LINKS_ALERT,
    action_payload: actionPayload,
    action_fingerprint: fingerprint({ action_type: monitoringActionTypes.PUBLISH_OFFICIAL_LINKS_ALERT, actionPayload }),
    execution_status: 'queued',
    canonical_target: { kind: 'activity_reviewed_source_alerts', destination: 'Activity' },
    blocker: null,
    retryable: true,
    finding_fingerprint: finding.fingerprint,
    rollback_payload: { operation: 'remove_by_action_fingerprint' },
  }
}

export async function executeMonitoringAction(plan, publisher) {
  if (plan?.execution_status !== 'queued' || plan?.action_type !== monitoringActionTypes.PUBLISH_OFFICIAL_LINKS_ALERT) {
    return { ...plan, execution_status: 'blocked', blocker: plan?.blocker ?? 'Action plan is not executable.' }
  }
  if (typeof publisher !== 'function') {
    return { ...plan, execution_status: 'blocked', blocker: 'Reviewed-alert publication capability is unavailable.' }
  }

  try {
    const result = await publisher({
      idempotencyKey: plan.action_fingerprint,
      target: plan.canonical_target,
      payload: plan.action_payload,
    })
    if (!result?.published || result?.idempotencyKey !== plan.action_fingerprint || !result?.readbackVerified) {
      return { ...plan, execution_status: 'failed', error_message: 'Publisher did not return matching idempotent readback evidence.' }
    }
    return {
      ...plan,
      execution_status: 'completed',
      canonical_result: result.canonicalResult ?? null,
      executed_at: result.executedAt,
      deployment_evidence: result.deploymentEvidence ?? null,
      verification_evidence: result.verificationEvidence,
    }
  } catch (error) {
    return { ...plan, execution_status: 'failed', error_message: error instanceof Error ? error.message : String(error) }
  }
}
