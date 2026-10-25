import { validateSurveyorSupervisionCompletion } from './surveyor_supervision_contract.mjs'

export const SUPERVISION_RETRY_MS = 60 * 60 * 1000
const terminalSteps = ['Run surveyor to terminal outcome', 'Verify complete coverage and consequences', 'Retain verified accepted baseline', 'Save monitoring baseline']

export function verifySupervisorCoverage({ report, manifest, receipt, run, projectionCoverage, gmail, queryIds, checkedAt }) {
  const now = Date.parse(checkedAt)
  if (!Number.isFinite(now)) throw new Error('Invalid supervision timestamp')
  if (queryIds.length !== 3 || new Set(queryIds).size !== 3) throw new Error('Three canonical private query IDs required')
  validateSurveyorSupervisionCompletion(report, manifest)
  if (now < Date.parse(report.checkedAt) || now - Date.parse(report.checkedAt) > 26 * 60 * 60 * 1000) throw new Error('Cloud result is stale; finish a fresh cloud run')
  if (receipt.operationalStatus !== 'accepted' || !receipt.readyForCache || receipt.reportCheckedAt !== report.checkedAt || receipt.replayRunId) throw new Error('Cloud receipt is not exact normal acceptance')
  if (String(run.databaseId) !== String(receipt.runId) || run.status !== 'completed' || run.conclusion !== 'success') throw new Error('Exact cloud run did not complete successfully')
  const job = run.jobs?.find(job => job.name === 'monitor')
  if (job?.conclusion !== 'success' || terminalSteps.some(name => !job.steps?.some(step => step.name === name && step.conclusion === 'success'))) throw new Error('Cloud terminal verification/retention/cache steps did not succeed')
  if (projectionCoverage.status !== 'complete') throw new Error('Current app artifacts do not match reviewed source projections')
  const privateFresh = now - Date.parse(gmail?.lastSuccessfulSearchThrough) < 24 * 60 * 60 * 1000
    && now >= Date.parse(gmail?.lastSuccessfulSearchThrough)
    && queryIds.every(id => gmail.lastSuccessfulSearch?.queries?.some(query => query.id === id && query.paginationComplete && Date.parse(query.checkedThrough) === Date.parse(gmail.lastSuccessfulSearchThrough)))
  return { checkedAt, publicStatus: 'complete', cloudRunId: String(receipt.runId), reportCheckedAt: report.checkedAt,
    privateStatus: privateFresh ? 'fresh_receipt_reused' : 'due', privateCheckedThrough: gmail?.lastSuccessfulSearchThrough ?? null,
    privateReason: privateFresh ? null : gmail?.lastAttempt?.reason ?? 'complete_private_search_due',
    unresolvedPrivateCandidates: gmail?.unresolvedCandidates?.length ?? 0 }
}

export function supervisorReceipt(previous, attempt) {
  if (!Number.isFinite(Date.parse(attempt.checkedAt))) throw new Error('Invalid attempt timestamp')
  return { version: 1, lastAttempt: attempt,
    lastVerifiedPublic: attempt.publicStatus === 'complete' ? attempt : previous?.lastVerifiedPublic ?? null,
    lastComplete: attempt.publicStatus === 'complete' && attempt.privateStatus === 'fresh_receipt_reused' ? attempt : previous?.lastComplete ?? null }
}

export function supervisionDue(receipt, checkedAt) {
  const last = Date.parse(receipt?.lastComplete?.checkedAt)
  return !Number.isFinite(last) || Date.parse(checkedAt) - last >= SUPERVISION_RETRY_MS || receipt?.lastAttempt?.publicStatus !== 'complete' || receipt?.lastAttempt?.privateStatus !== 'fresh_receipt_reused'
}
