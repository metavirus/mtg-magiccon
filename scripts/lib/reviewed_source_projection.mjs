// A fetched/announced source is not necessarily hydrated into the app.
// Required projections bind reviewed source bytes to the app-consumed artifact.
import { createHash } from 'node:crypto'

export const projectionDigest = bytes => createHash('sha256').update(bytes).digest('hex')
export const REQUIRED_SCHEDULE_PROJECTIONS = ['atlanta-black-lotus-vip', 'atlanta-experience-panels-and-events', 'atlanta-experience-meet-and-greets', 'atlanta-gathering-grounds-schedule', 'atlanta-family-magic-schedule', 'atlanta-experience-the-councils-call']

export function reviewedSourceProjectionCoverage(results, reviews, artifacts = {}) {
  const sources = Object.entries(reviews).map(([id, review]) => {
    const current = results.find(source => source.id === id)
    const artifact = artifacts[review.projectionPath]
    const reasons = []
    if (!current) reasons.push('source_not_fetched')
    if (!/^[a-f0-9]{64}$/.test(review.contentHash ?? '') || current?.contentHash !== review.contentHash) reasons.push('source_content_requires_hydration_review')
    if (!/^[a-f0-9]{64}$/.test(review.contentLinkHash ?? '') || current?.contentLinkHash !== review.contentLinkHash) reasons.push('source_links_require_hydration_review')
    if (!artifact || projectionDigest(artifact) !== review.projectionHash) reasons.push('app_projection_missing_or_changed_without_review')
    if (!review.reason?.trim() || !Number.isFinite(Date.parse(review.reviewedAt))) reasons.push('review_metadata_missing')
    return { id, status: reasons.length ? 'partial' : 'complete', reasons, currentContentHash: current?.contentHash, reviewedContentHash: review.contentHash, projectionPath: review.projectionPath, projectionHash: review.projectionHash }
  })
  const missingSourceIds = REQUIRED_SCHEDULE_PROJECTIONS.filter(id => !reviews[id])
  return { status: sources.length && !missingSourceIds.length && sources.every(source => source.status === 'complete') ? 'complete' : 'partial', configuredCount: sources.length, missingSourceIds, sources }
}
