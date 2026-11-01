import { describe, expect, it } from 'vitest'
import { buildAtlantaMerchReview } from './atlantaMerchReview'
import { formatCatalogOfferValue } from './catalog'
import { canLoadAtlantaMerchReview } from './catalogReviewMode'
import { readFileSync } from 'node:fs'

describe('Atlanta merchandise source review', () => {
  const model = buildAtlantaMerchReview()
  const store = model.offers.filter(item => item.family === 'show_store')
  const lotus = model.offers.filter(item => item.family === 'black_lotus')

  it('requires the explicit review flag, preview owner mode, and Kavi operator', () => {
    expect(canLoadAtlantaMerchReview(['atlanta-merch-review'], true, true)).toBe(true)
    expect(canLoadAtlantaMerchReview(['atlanta-merch-review'], false, true)).toBe(false)
    expect(canLoadAtlantaMerchReview(['atlanta-merch-review'], true, false)).toBe(false)
    expect(canLoadAtlantaMerchReview([], true, true)).toBe(false)
  })

  it('keeps review controls and the write handler fenced, including the shared detail layer', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    const browser = readFileSync('src/CatalogBrowser.tsx', 'utf8')
    expect(app).toContain('if (offer.attributes?.local_review) return')
    expect(app).toContain('catalogOffer && !catalogOffer.attributes?.local_review && catalogOwnerId')
    expect(app).toContain("if (input.objectId.startsWith('catalog-offer-review:')) return")
    expect(app).toContain('{!catalogOffer?.attributes?.local_review && !isSyntheticNoteGroupId(detail.id) && <ObjectNotes')
    expect(browser).toContain('{!reviewOnly && (')
  })

  it('preserves the event-wide Festival in a Box limit and lounge-only VIP purchase rule in both channels', () => {
    const boxes = model.offers.filter(item => item.product_name === 'Festival in a Box: Atlanta 2026')
    expect(boxes).toHaveLength(2)
    for (const box of boxes) {
      expect(box.description).toContain('not the Show Store')
      expect(box.description).toContain('Limit 2 per VIP for the event across preorder and onsite')
      expect(box.description).not.toContain('Preorder limit: 2')
    }
  })

  it('groups 202 public variants into 60 products and preserves eight announced Lotus items', () => {
    expect(store).toHaveLength(60)
    expect(lotus).toHaveLength(8)
    expect(store.reduce((count, item) => count + (item.attributes!.source_variant_keys as string[]).length, 0)).toBe(202)
    expect(new Set(model.offers.map(item => item.offer_id)).size).toBe(68)
  })

  it('shares six identities without importing public prices or variants into Lotus', () => {
    expect(lotus.filter(item => store.some(other => item.product_id === other.product_id))).toHaveLength(6)
    for (const item of lotus) {
      expect(item.price_amount).toBeNull()
      expect(formatCatalogOfferValue(item)).toBe('Price pending')
      expect(item.attributes!.source_variant_keys).toEqual([])
      expect(item.variant_label).toBe('Variants pending')
    }
  })

  it('uses reviewed browse categories consistently across channels without rewriting source categories', () => {
    expect(new Set(store.map(item => item.category)).size).toBe(8)
    expect(model.offers.some(item => ['Merchandise', 'Uncategorized', ''].includes(item.category))).toBe(false)
    expect(store.find(item => item.product_name === 'Jace Reversible Hoodie')?.category).toBe('Clothing & footwear')
    expect(store.find(item => item.product_name === 'Eye of Jace Liquid Core Jumbo Spindown')?.category).toBe('Play accessories')
    expect(store.find(item => item.product_name === 'Mox Pearl Lanyard & Pin')?.category).toBe('Pins & small accessories')
    for (const item of lotus) {
      const shared = store.find(other => other.product_id === item.product_id)
      if (shared) expect(item.category).toBe(shared.category)
    }
    const source = JSON.parse(readFileSync('research/merchandise/2026-10-31/normalized-merch-review.json', 'utf8'))
    expect(source.products.every((item: { category: string | null }) => !item.category)).toBe(true)
  })

  it('retains two missing images, unconfirmed stock, and no personal state or approval', () => {
    expect(model.offers.filter(item => !item.presentationUrl)).toHaveLength(2)
    for (const item of model.offers) {
      expect(item.interests).toEqual([])
      expect(item.availability).toBe('unknown')
      expect(item.attributes!.local_review).toBe(true)
      expect(item.presentation_match_status).toBe('unreviewed')
      expect(item.offer_reviewed_at).toBe('')
    }
  })
})
