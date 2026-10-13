import { describe, expect, it } from 'vitest'
import { projectionDigest, reviewedSourceProjectionCoverage, REQUIRED_SCHEDULE_PROJECTIONS } from './reviewed_source_projection.mjs'

describe('source detection must close app hydration', () => {
  const artifact = '[{"id":"stable-event","time":"4-5 PM"}]'
  const source = { id: 'atlanta-black-lotus-vip', contentHash: 'a'.repeat(64), contentLinkHash: 'b'.repeat(64) }
  const review = { contentHash: source.contentHash, contentLinkHash: source.contentLinkHash, projectionPath: 'src/data/events.json', projectionHash: projectionDigest(artifact), reviewedAt: '2026-10-13T23:00:00Z', reason: 'Every official session reconciled; stable selection IDs retained.' }
  const check = (current = source, bytes = artifact) => reviewedSourceProjectionCoverage(REQUIRED_SCHEDULE_PROJECTIONS.map(id => ({ ...current, id })), Object.fromEntries(REQUIRED_SCHEDULE_PROJECTIONS.map(id => [id, review])), { [review.projectionPath]: bytes })
  it('accepts an exact reviewed source and app artifact', () => expect(check().status).toBe('complete'))
  it('holds changed source bytes even if an announcement already closed', () => expect(check({ ...source, contentHash: 'c'.repeat(64) }).sources[0].reasons).toContain('source_content_requires_hydration_review'))
  it('holds an obsolete/missing app projection independently of unchanged source', () => expect(check(source, 'old schedule').sources[0].reasons).toContain('app_projection_missing_or_changed_without_review'))
  it('holds missing configured source', () => expect(reviewedSourceProjectionCoverage([], { [source.id]: review }).status).toBe('partial'))
  it('cannot silently remove a required schedule projection', () => expect(reviewedSourceProjectionCoverage([], {}).missingSourceIds).toEqual(REQUIRED_SCHEDULE_PROJECTIONS))
})
