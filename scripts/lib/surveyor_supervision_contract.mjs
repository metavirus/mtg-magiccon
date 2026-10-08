import { validateSurveyorClosureManifest } from './surveyor_closure_contract.mjs'

// Read-only finish gate for downloaded cloud artifacts. This never discovers,
// stages, accepts, or replaces the authoritative GitHub Actions baseline.
export function validateSurveyorSupervisionCompletion(report, manifest) {
  validateSurveyorClosureManifest(manifest, report)
  validateSurveyorCoverage(report)
  return { status: 'complete', checkedAt: report.checkedAt, catchCount: manifest.catches.length }
}

export function validateSurveyorCoverage(report) {
  const gaps = []
  if (report?.coverageStatus !== 'complete') gaps.push('overall coverage is not complete')
  if (report?.failures?.length || report?.failureCount) gaps.push('source fetch failures remain')
  const news = report?.newsletterIntake
  if (news?.coverageStatus === 'partial' || news?.failures?.length || news?.failureCount || news?.unfetched?.length || news?.unfetchedCount || news?.missingDiscoverySourceIds?.length) gaps.push('article/discovery coverage remains open')
  if (report?.detailPageCoverage?.gaps?.length || report?.detailPageCoverage?.gapCount) gaps.push('linked detail-page coverage remains open')
  const exhibitors = report?.exhibitorDirectoryCoverage
  if (report?.sourceCount || exhibitors) {
    const source = exhibitors?.sources?.[0]
    if (exhibitors?.configuredCount !== 1 || exhibitors?.checkedCount !== 1 || exhibitors?.sources?.length !== 1 || source?.id !== 'atlanta-experience-exhibitors' || source?.eventId !== '21389' || source?.eventSlug !== 'htwhdatl26shdl10' || source?.categoryId !== '20590' || !Number.isInteger(source?.count) || source.count < 1 || !/^[a-f0-9]{64}$/.test(source?.rosterHash ?? '')) gaps.push('event-bound exhibitor directory coverage is missing or invalid')
  }
  const availability = report?.ticketedPlay?.availabilityCoverage
  if (availability?.status === 'partial' || availability?.notCovered?.length || availability?.unknownCount) gaps.push('purchasable-event availability coverage remains open')
  for (const [key, coverage] of Object.entries(report ?? {})) {
    if (key.endsWith('Coverage') && coverage?.status && coverage.status !== 'complete') gaps.push(`${key} remains open`)
  }
  if (gaps.length) throw new Error(`Surveyor supervision unfinished: ${gaps.join('; ')}. Resolve bounded agent-owned work before a quiet completion.`)
  return { status: 'complete', checkedAt: report.checkedAt }
}
