import { describe, expect, it } from 'vitest'
import { projectResolutionToInfo } from '../../scripts/lib/monitoring_info_projection.mjs'

const observation = { fingerprint: 'abc', observedAt: '2026-08-21T00:00:00Z', sourceLabel: 'Official FAQ', sourceUrl: 'https://example.com' }
const concept = { concept_key: 'atlanta:ticketed-play:sales-opening', title: 'Ticketed Play sales', current_summary: 'Sales open August 25.' }

describe('monitoring Info projection', () => {
  it('suppresses noise and corroboration', () => {
    expect(projectResolutionToInfo({ resolution: 'noise', concept: null }, observation)).toBeNull()
    expect(projectResolutionToInfo({ resolution: 'corroboration', concept }, observation)).toBeNull()
  })
  it('persists a deterministic meaningful update once', () => {
    const enriched = { ...observation, sourceId: 'official-faq', contentHash: 'hash', infoArticle: { lede: 'Useful.', sections: [{ key: 'sale', title: 'Sale timing' }], unknowns: [], contradictions: [], recent_changes: [] } }
    expect(projectResolutionToInfo({ resolution: 'material_update', concept }, enriched)).toMatchObject({ feed: { entry_key: 'atlanta:ticketed-play:sales-opening:material_update:abc', topic_key: 'ticketed-play' }, topic: { article_status: 'maintained' } })
  })
  it('does not publish link-only discovery as finished Info', () => expect(projectResolutionToInfo({ resolution: 'new', concept }, observation)).toBeNull())
})
