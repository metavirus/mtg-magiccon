import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { artistCardCandidates } from '../data/artistCardCandidates'

describe('artist ownership publication boundary', () => {
  it('ships synthetic examples, not an exported personal collection', () => {
    expect(artistCardCandidates.every(card => card.id.startsWith('preview-') && card.priceAsOf === 'Preview only')).toBe(true)
    const generator = readFileSync('scripts/generate_artist_card_candidates_module.mjs', 'utf8')
    expect(generator).toContain("'local-assets', 'artist-card-working', 'artistCardCandidates.private.ts'")
    expect(generator).not.toContain("'src', 'data', 'artistCardCandidates.ts'")
  })
  it('never uses examples as authenticated recovery data', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    expect(app.match(/cards: currentOwnerId\?\.startsWith\('preview-'\) \? artistCardCandidates : \[\]/g)).toHaveLength(2)
  })
})
