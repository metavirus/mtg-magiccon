import { validateSurveyorClosureManifest } from './surveyor_closure_contract.mjs'

// Read-only finish gate for downloaded cloud artifacts. This never discovers,
// stages, accepts, or replaces the authoritative GitHub Actions baseline.
export function validateSurveyorSupervisionCompletion(report, manifest) {
  validateSurveyorClosureManifest(manifest, report)
  const gaps = []
  if (report?.coverageStatus !== 'complete') gaps.push('overall coverage is not complete')
  if (report?.failures?.length || report?.failureCount) gaps.push('source fetch failures remain')
  const news = report?.newsletterIntake
  if (news?.coverageStatus === 'partial' || news?.failures?.length || news?.failureCount || news?.unfetched?.length || news?.unfetchedCount || news?.missingDiscoverySourceIds?.length) gaps.push('article/discovery coverage remains open')
  if (report?.detailPageCoverage?.gaps?.length || report?.detailPageCoverage?.gapCount) gaps.push('linked detail-page coverage remains open')
  const availability = report?.ticketedPlay?.availabilityCoverage
  if (availability?.status === 'partial' || availability?.notCovered?.length || availability?.unknownCount) gaps.push('purchasable-event availability coverage remains open')
  for (const [key, coverage] of Object.entries(report ?? {})) {
    if (key.endsWith('Coverage') && coverage?.status && coverage.status !== 'complete') gaps.push(`${key} remains open`)
  }
  if (gaps.length) throw new Error(`Surveyor supervision unfinished: ${gaps.join('; ')}. Resolve bounded agent-owned work before a quiet completion.`)
  return { status: 'complete', checkedAt: report.checkedAt, catchCount: manifest.catches.length }
}
