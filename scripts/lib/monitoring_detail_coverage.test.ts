import { describe, expect, it } from 'vitest'
import { relevantDetailCoverageGaps, retainedDetailCoverageGaps } from './monitoring_detail_coverage.mjs'
const base = 'https://mcatlanta.mtgfestivals.com/en-us/'
const program = `${base}experience/panels-and-events.html`
const guests = `${base}guests.html`
const now = '2026-09-20T00:00:00Z'
describe('current official detail-page coverage', () => {
  it('catches existing links and relevant overviews without an old baseline', () => {
    expect(relevantDetailCoverageGaps([{ url: program }, { url: guests }], [], 'home')).toHaveLength(2)
    expect(relevantDetailCoverageGaps([{ url: program }], [program], 'home')).toEqual([])
  })
  it('requires dated exclusions and reopens expired exclusions', () => {
    const exclusion = { url: program, reason: 'Reviewed duplicate', reviewedAt: '2026-09-19', reviewAfter: '2026-09-27' }
    const gap = { sourceId: 'home', url: program, label: '' }
    expect(relevantDetailCoverageGaps([{ url: program }], [], 'home', [exclusion], now)).toEqual([])
    expect(retainedDetailCoverageGaps([gap], [], [], [exclusion], now)).toEqual([])
    expect(relevantDetailCoverageGaps([{ url: program }], [], 'home', [exclusion], '2026-09-28')).toEqual([gap])
    expect(relevantDetailCoverageGaps([{ url: program }], [], 'home', [{ ...exclusion, reason: '' }], now)).toEqual([gap])
  })
  it('deduplicates decorations and excludes other hosts, credentials, assets and unrelated paths', () => {
    const links = [program, `${program}?tracking=1#x`, 'https://evil.example/en-us/guests.html', `${base}info/map.png`, `${base}industry/exhibitor-manual.html`, 'https://user@mcatlanta.mtgfestivals.com/en-us/guests.html'].map(url => ({ url }))
    expect(relevantDetailCoverageGaps(links, [], 'home')).toEqual([{ sourceId: 'home', url: program, label: '' }])
  })
  it('retains unresolved gaps even when the originating link disappears', () => {
    const gap = { sourceId: 'home', url: program, label: 'Panels' }
    expect(retainedDetailCoverageGaps([gap], [], [])).toEqual([gap])
    expect(retainedDetailCoverageGaps([gap], [], [program])).toEqual([])
  })
  it('does not collapse separate official event identities into one excluded detail page', () => {
    const detail = `${base}magic-play/ticketed-play-schedule/ticketed-play-information.html`
    const exclusion = { url: `${detail}?gtID=944082`, reason: 'Covered by exact LEAP identity', reviewedAt: '2026-09-19', reviewAfter: '2026-09-27' }
    const gaps = relevantDetailCoverageGaps([{ url: `${detail}?gtID=944082&panel-name=title` }, { url: `${detail}?gtID=123456` }], [], 'home', [exclusion], now)
    expect(gaps).toEqual([{ sourceId: 'home', url: `${detail}?gtID=123456`, label: '' }])
  })
})
