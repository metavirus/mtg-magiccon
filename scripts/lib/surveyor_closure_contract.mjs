export const SURVEYOR_CLOSURE_SCHEMA_VERSION = 1

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

export function completeSurveyorClosureManifest(report, outcomes, generatedAt = new Date().toISOString()) {
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
    status: 'complete',
    generatedAt,
    report: { checkedAt: report?.checkedAt ?? null, changeCount: catches.length },
    catches,
  }
  validateSurveyorClosureManifest(manifest, report)
  return manifest
}

export function validateSurveyorClosureManifest(manifest, report = null) {
  const errors = []
  if (!manifest || typeof manifest !== 'object') errors.push('manifest must be an object')
  if (manifest?.schemaVersion !== SURVEYOR_CLOSURE_SCHEMA_VERSION) errors.push(`schemaVersion must be ${SURVEYOR_CLOSURE_SCHEMA_VERSION}`)
  if (manifest?.status !== 'complete') errors.push('status must be complete')
  if (!Array.isArray(manifest?.catches)) errors.push('catches must be an array')

  const expected = report ? surveyorCatchDescriptors(report) : null
  if (expected) {
    if (manifest?.report?.checkedAt !== report?.checkedAt) errors.push('report.checkedAt does not match the monitor report')
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
    if (!TERMINAL_DISPOSITION_SET.has(item.disposition)) errors.push(`${item.catchId}: disposition ${item.disposition ?? 'missing'} is blocked or unmapped`)
    if (!Array.isArray(item.targets) || item.targets.length === 0) errors.push(`${item.catchId}: at least one terminal target is required`)
    if (!Array.isArray(item.readbacks) || item.readbacks.length === 0) errors.push(`${item.catchId}: at least one exact readback is required`)
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
