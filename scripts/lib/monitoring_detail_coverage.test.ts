import { describe, expect, it } from 'vitest'
import { newRelevantDetailCoverageGaps, retainedDetailCoverageGaps } from './monitoring_detail_coverage.mjs'

const home = 'https://mcatlanta.mtgfestivals.com/en-us.html'
const program = 'https://mcatlanta.mtgfestivals.com/en-us/experience/spell-slayers.html'

describe('new official detail-page coverage', () => {
  it('flags a newly linked relevant detail page without treating it as checked', () => {
    const gaps = newRelevantDetailCoverageGaps([], [{ url: program, label: 'Spell Slayers' }], [home], 'atlanta-official-home')
    expect(gaps).toEqual([{ sourceId: 'atlanta-official-home', url: program, label: 'Spell Slayers' }])
    expect(newRelevantDetailCoverageGaps([], [{ url: program }], [program], 'home')).toEqual([])
  })

  it('ignores label-only changes, external links, assets, and ordinary overview navigation', () => {
    const links = [{ url: program, label: 'New label' }, { url: home }, { url: 'https://example.com/en-us/info/map.html' }, { url: 'https://mcatlanta.mtgfestivals.com/en-us/info/map.png' }]
    expect(newRelevantDetailCoverageGaps([{ url: program, label: 'Old label' }], links, [], 'home')).toEqual([])
    expect(newRelevantDetailCoverageGaps(null, links, [], 'home')).toEqual([])
  })

  it('retains an uncovered page until the watch set includes it', () => {
    const gap = { sourceId: 'home', url: program, label: 'Spell Slayers' }
    expect(retainedDetailCoverageGaps([gap], [], [home])).toEqual([gap])
    expect(retainedDetailCoverageGaps([gap], [], [program])).toEqual([])
  })
})
