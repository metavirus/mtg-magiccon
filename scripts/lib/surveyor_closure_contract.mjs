import { createHash } from 'node:crypto'

export const SURVEYOR_CLOSURE_SCHEMA_VERSION = 2
const stable = value => Array.isArray(value) ? value.map(stable) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, stable(value[key])])) : value
export const surveyorReportDigest = report => createHash('sha256').update(JSON.stringify(stable(report))).digest('hex')

export const TERMINAL_DISPOSITIONS = Object.freeze([
  'canonical_update',
  'routed_signal',
  'retained_evidence',
  'ignored_noise',
])

const TERMINAL_DISPOSITION_SET = new Set(TERMINAL_DISPOSITIONS)
const SUPPORTED_INTAKE_KINDS = new Set([
  'public_watch',
  'first_party_newsletter',
  'ticketed_play_inventory',
])

export function surveyorCatchDescriptors(report) {
  return (Array.isArray(report?.changes) ? report.changes : []).map((change, index) => ({
    catchId: `${index}:${String(change?.id ?? 'missing-id')}`,
    sourceId: String(change?.id ?? ''),
    intakeKind: change?.intakeKind ?? 'public_watch',
    meaningful: true,
  }))
}

export function assertSupportedSurveyorCatches(report) {
  const unsupported = surveyorCatchDescriptors(report).filter(item => !item.sourceId || !SUPPORTED_INTAKE_KINDS.has(item.intakeKind))
  if (unsupported.length) {
    throw new Error(`Surveyor closure blocked: unmapped meaningful catch(es): ${unsupported.map(item => `${item.catchId} (${item.intakeKind})`).join(', ')}`)
  }
}

export function pendingSurveyorClosureManifest(report, generatedAt = new Date().toISOString()) {
  return {
    schemaVersion: SURVEYOR_CLOSURE_SCHEMA_VERSION,
    status: 'blocked',
    generatedAt,
    report: {
      checkedAt: report?.checkedAt ?? null,
      digest: surveyorReportDigest(report),
      changeCount: Array.isArray(report?.changes) ? report.changes.length : 0,
    },
    catches: surveyorCatchDescriptors(report).map(item => ({
      ...item,
      disposition: 'blocked',
      targets: [],
      readbacks: [],
      rationale: 'Staging did not reach a verified terminal outcome.',
    })),
  }
}

export function completeSurveyorClosureManifest(report, outcomes, generatedAt = new Date().toISOString(), validate = true) {
  assertSupportedSurveyorCatches(report)
  const catches = surveyorCatchDescriptors(report).map(item => {
    const outcome = outcomes.get(item.catchId)
    return {
      ...item,
      disposition: outcome?.disposition ?? 'unmapped',
      targets: outcome?.targets ?? [],
      readbacks: outcome?.readbacks ?? [],
      rationale: outcome?.rationale ?? 'No terminal outcome was recorded.',
    }
  })
  const manifest = {
    schemaVersion: SURVEYOR_CLOSURE_SCHEMA_VERSION,
    status: catches.some(item => !TERMINAL_DISPOSITION_SET.has(item.disposition)) ? 'blocked' : 'complete',
    generatedAt,
    report: { checkedAt: report?.checkedAt ?? null, digest: surveyorReportDigest(report), changeCount: catches.length },
    catches,
  }
  if (validate) validateSurveyorClosureManifest(manifest, report)
  return manifest
}

export function validateSurveyorClosureManifest(manifest, report = null, { allowEditorial = false } = {}) {
  const errors = []
  if (!manifest || typeof manifest !== 'object') errors.push('manifest must be an object')
  if (manifest?.schemaVersion !== SURVEYOR_CLOSURE_SCHEMA_VERSION) errors.push(`schemaVersion must be ${SURVEYOR_CLOSURE_SCHEMA_VERSION}`)
  if (manifest?.status !== 'complete' && !(allowEditorial && manifest?.status === 'blocked')) errors.push('status must be complete')
  if (!Array.isArray(manifest?.catches)) errors.push('catches must be an array')

  const expected = report ? surveyorCatchDescriptors(report) : null
  if (expected) {
    if (manifest?.report?.checkedAt !== report?.checkedAt) errors.push('report.checkedAt does not match the monitor report')
    if (manifest?.report?.digest !== surveyorReportDigest(report)) errors.push('report digest does not match the exact monitor report')
    if (manifest?.catches?.length !== expected.length) errors.push(`expected ${expected.length} catch closure(s), found ${manifest?.catches?.length ?? 0}`)
    const expectedIds = new Set(expected.map(item => item.catchId))
    const actualIds = new Set((manifest?.catches ?? []).map(item => item.catchId))
    for (const catchId of expectedIds) if (!actualIds.has(catchId)) errors.push(`missing closure for ${catchId}`)
    for (const catchId of actualIds) if (!expectedIds.has(catchId)) errors.push(`unexpected closure for ${catchId}`)
  }

  const seen = new Set()
  for (const item of manifest?.catches ?? []) {
    if (!item.catchId || seen.has(item.catchId)) errors.push(`catchId must be present and unique (${item.catchId ?? 'missing'})`)
    seen.add(item.catchId)
    if (item.meaningful !== true) errors.push(`${item.catchId}: meaningful must be true`)
    const expectedItem = expected?.find(entry => entry.catchId === item.catchId)
    if (expectedItem && (item.sourceId !== expectedItem.sourceId || item.intakeKind !== expectedItem.intakeKind)) errors.push(`${item.catchId}: source or intake identity mismatch`)
    const pendingEditorial = allowEditorial && item.disposition === 'pending_editorial'
    if (!TERMINAL_DISPOSITION_SET.has(item.disposition) && !pendingEditorial) errors.push(`${item.catchId}: disposition ${item.disposition ?? 'missing'} is blocked or unmapped`)
    if (pendingEditorial && !item.targets?.some(target => target.kind === 'agent_editorial_queue') || pendingEditorial && !item.rationale?.includes('Agent interpretation required:')) errors.push(`${item.catchId}: editorial handoff proof missing`)
    if (!Array.isArray(item.targets) || item.targets.length === 0) errors.push(`${item.catchId}: at least one terminal target is required`)
    if (!Array.isArray(item.readbacks) || item.readbacks.length === 0) errors.push(`${item.catchId}: at least one exact readback is required`)
    if (item.targets?.some(target => target.kind === 'home') && item.readbacks?.some(readback => readback.observed?.evidence?.home_signal_kind === 'interesting_announcement')) {
      const home = item.readbacks.find(readback => readback.observed?.app_projection_verified === true)?.observed
      if (!home || home.destination !== 'Home' || !['unread', 'read', 'archived'].includes(home.status) || !home.title || !home.summary) errors.push(`${item.catchId}: Home announcement lacks verified app projection`)
    }
    for (const readback of item.readbacks ?? []) {
      const matchPresent = readback?.match && typeof readback.match === 'object' && Object.keys(readback.match).length > 0
      const observedPresent = Array.isArray(readback?.observed)
        ? readback.observed.length > 0
        : readback?.observed && typeof readback.observed === 'object' && Object.keys(readback.observed).length > 0
      if (!readback?.system || !readback?.relation || !matchPresent || !observedPresent) errors.push(`${item.catchId}: readback requires non-empty system, relation, match, and observed metadata`)
    }
  }

  if (errors.length) throw new Error(`Surveyor closure verification failed:\n- ${errors.join('\n- ')}`)
  return manifest
}

export function validatePendingSurveyorEditorialManifest(manifest, report) {
  validateSurveyorClosureManifest(manifest, report, { allowEditorial: true })
  if (manifest.status !== 'blocked' || !manifest.catches.some(item => item.disposition === 'pending_editorial')) throw new Error('Expected an exact pending editorial handoff')
  return manifest
}
