import { validateSurveyorSupervisionCompletion, validateSurveyorCoverage } from './surveyor_supervision_contract.mjs'

export const HOLD_LIMIT_MS = 24 * 60 * 60 * 1000

export function coverageComplete(report) {
  try {
    // Reuse the coverage gate with an empty, report-bound closure; closure is
    // checked separately after staging the actual catches.
    validateSurveyorCoverage(report)
    return true
  } catch { return false }
}

export function editorialFingerprints(manifest) {
  return [...new Set((manifest.catches ?? []).filter(item => item.disposition === 'pending_editorial')
    .flatMap(item => (item.readbacks ?? []).map(proof => proof.match?.fingerprint).filter(Boolean)))].sort()
}

// All side effects are injected so the hold/recovery ordering can be exercised
// without discovery, credentials, SMTP, or a live database.
export async function runSurveyorRuntime({ ops, now = new Date().toISOString(), runId, replayRunId = null }) {
  let pending = null
  let recovered = null
  let phase = 'load'
  const receipt = async (operationalStatus, fields = {}, exitCode = 0) => {
    const value = { schemaVersion: 1, operationalStatus, runId, replayRunId, recordedAt: now,
      readyForCache: operationalStatus === 'accepted', ...fields }
    await ops.writeReceipt(value)
    return { ...value, exitCode }
  }
  const hold = async (status, report, manifest, prior) => {
    const firstHeldAt = prior?.firstHeldAt ?? now
    if (!Number.isFinite(Date.parse(firstHeldAt))) throw new Error('Invalid retained hold timestamp')
    const fields = { firstHeldAt, originalRunId: prior?.originalRunId ?? runId,
      fingerprints: prior?.operationalStatus === 'awaiting_editorial' ? prior.fingerprints : editorialFingerprints(manifest ?? {}),
      reportCheckedAt: report.checkedAt, overdue: Date.parse(now) - Date.parse(firstHeldAt) > HOLD_LIMIT_MS }
    if (!replayRunId) await ops.savePending({ ...fields, operationalStatus: status, report, manifest })
    return receipt(status, fields, fields.overdue ? 1 : 0)
  }
  const stage = async report => {
    phase = 'stage'
    const manifest = await ops.stage(report)
    if (manifest.status === 'complete') validateSurveyorSupervisionCompletion(report, manifest)
    else await ops.validatePendingEditorial(manifest, report)
    return manifest
  }
  try {
    if (replayRunId) {
      const report = await ops.readReplay()
      if (!coverageComplete(report)) return await hold('awaiting_repair', report, null, null)
      const manifest = await stage(report)
      if (manifest.status !== 'complete') return await hold('awaiting_editorial', report, manifest, null)
      return await receipt('replay_verified', { reportCheckedAt: report.checkedAt })
    }
    pending = await ops.loadPending()
    if (pending && !['awaiting_editorial', 'awaiting_repair'].includes(pending.operationalStatus)) throw new Error('Unknown retained hold status')
    if (pending?.operationalStatus === 'awaiting_editorial') {
      if (!coverageComplete(pending.report)) throw new Error('Retained editorial report has incomplete coverage')
      const manifest = await stage(pending.report)
      if (manifest.status !== 'complete') return await hold('awaiting_editorial', pending.report, manifest, pending)
      phase = 'recovery-proof'
      recovered = { originalRunId: pending.originalRunId, firstHeldAt: pending.firstHeldAt,
        fingerprints: pending.fingerprints, reportCheckedAt: pending.report.checkedAt }
      await ops.saveRecovery(pending.report, manifest, recovered)
      pending = null
    }
    phase = 'discover'
    const report = await ops.discover()
    if (!coverageComplete(report)) return await hold('awaiting_repair', report, null, pending)
    const manifest = await stage(report)
    if (manifest.status !== 'complete') return await hold('awaiting_editorial', report, manifest, pending)
    phase = 'verify'
    await ops.verify(report, manifest)
    phase = 'alert'
    await ops.alert(report, manifest)
    phase = 'accept'
    await ops.accept(report, manifest)
    phase = 'checkpoint'
    const checkpoint = await ops.saveCheckpoint(report, manifest)
    await ops.clearPending()
    return await receipt('accepted', { reportCheckedAt: report.checkedAt, checkpoint, recovered })
  } catch (error) {
    // Avoid serializing exception text: child errors may include request headers
    // or SMTP diagnostics. The child logs contain their own execution evidence.
    return receipt('failed', { failedStage: phase, errorCode: error.code ?? 'SURVEYOR_EXECUTION_FAILED',
      firstHeldAt: pending?.firstHeldAt ?? null, originalRunId: pending?.originalRunId ?? null }, 1)
  }
}
