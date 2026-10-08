import { describe, expect, it } from 'vitest'
import reviews from '../../monitoring/exhibitor-highlights.json'
import { exhibitorHighlight, type HighlightReview } from './exhibitorHighlights'

const sourceFor = (id: string, review: HighlightReview) => ({ id, name: review.sourceName, booth: review.sourceBooth,
  description: review.evidence.descriptionIncludes.join(' '), specials: review.evidence.offers })
describe('reviewed exhibitor prominence', () => {
  it('requires source-bound review, never promotional keywords, featured flags or a zero price', () => {
    const promo = { id: 'unknown', name: 'Super Exclusive', booth: '1', description: 'Exclusive! FREE! First four people save one cent!', specials: [{ id: '1', title: 'Exclusive special', description: 'Free with $200 sale', price: '0.00' }], featured: true }
    expect(exhibitorHighlight(promo)).toBe('')
    expect(exhibitorHighlight(promo, { sourceName: promo.name, sourceBooth: promo.booth, summary: 'Unsubstantiated', reason: '', sourceUrl: '', reviewedAt: '', evidence: { descriptionIncludes: [], offers: [] } })).toBe('')
  })
  it('retires a highlight when its actual claim, price, booth or identity changes', () => {
    for (const [id, review] of Object.entries(reviews)) {
      const source = sourceFor(id, review)
      expect(exhibitorHighlight(source)).toBe(review.summary)
      for (const delta of [{ name: 'Changed' }, { booth: 'Changed' }]) expect(exhibitorHighlight({ ...source, ...delta })).toBe('')
      if (review.evidence.descriptionIncludes.length) expect(exhibitorHighlight({ ...source, description: '' })).toBe('')
      if (source.specials.length) {
        expect(exhibitorHighlight({ ...source, specials: [] })).toBe('')
        expect(exhibitorHighlight({ ...source, specials: source.specials.map(offer => ({ ...offer, price: '999' })) })).toBe('')
      }
      expect(exhibitorHighlight({ ...source, description: `${source.description} Unrelated company-history edit.`, specials: [...source.specials, { id: 'noise', title: 'Save a cent!', description: 'Only the first four shoppers', price: '0.00' }] })).toBe(review.summary)
      expect(new URL(review.sourceUrl).searchParams.get('gtID')).toBe(id)
      expect(review.summary.length).toBeLessThanOrEqual(120)
      expect(review.reason).not.toBe('')
    }
  })
})
