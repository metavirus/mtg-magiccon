import { describe, expect, it } from 'vitest'
import {
  buildCatalogPromotionPlan,
  catalogPresentationRoute,
  type CatalogImportBatch,
  type CatalogItemReviewDecision,
  type CatalogPhotoIntakeItem,
  type CatalogPhotoIntakeReviewManifest,
} from './catalogImport'

const sha = (character: string) => character.repeat(64)

const manifestItem = (sourceItemKey: string, name: string, priceMinor: number): CatalogPhotoIntakeItem => ({
  source_item_key: sourceItemKey,
  name,
  display_price: `$${(priceMinor / 100).toFixed(2)}`,
  currency: 'USD',
  price_minor: priceMinor,
  presentation_quality: 'midsize',
  media: {
    evidence: `items/${sourceItemKey}/evidence.webp`,
    card: `items/${sourceItemKey}/card.webp`,
    thumb: `items/${sourceItemKey}/thumb.webp`,
  },
  hashes: {
    evidence_sha256: sha('b'),
    card_sha256: sha('c'),
    thumb_sha256: sha('d'),
  },
})

const reviewManifest = (items = [manifestItem('item-b', 'Arcane Signet Pin', 1500), manifestItem('item-a', 'Fblthp Mug', 2500)]): CatalogPhotoIntakeReviewManifest => ({
  schema_version: 1,
  catalog: {
    catalog_key: 'atlanta-2026-show-store',
    event_key: 'magiccon_atlanta_2026',
    family: 'show_store',
    title: 'MagicCon Atlanta 2026 Show Store',
    section: 'Accessories',
    fixture_only: false,
  },
  source: {
    source_kind: 'observed_onsite_photo',
    source_label: 'Friday Show Store board',
    source_url: 'https://example.com/source',
    observed_on: '2026-11-13',
    rights_note: 'Private evidence; publish reviewed derivatives only.',
    original_filename: 'show-store.webp',
    original_path: `originals/${sha('a')}.webp`,
    original_sha256: sha('a'),
    rectified_sha256: sha('e'),
  },
  review_gate: { status: 'needs_review' },
  items,
})

const approvedReview = (sourceItemKey: string, overrides: Partial<Extract<CatalogItemReviewDecision, { decision: 'approve' }>> = {}): Extract<CatalogItemReviewDecision, { decision: 'approve' }> => ({
  sourceItemKey,
  decision: 'approve',
  identityStatus: 'exact_product',
  canonicalKey: sourceItemKey,
  offerKey: `${sourceItemKey}-offer`,
  productName: sourceItemKey === 'item-a' ? 'Fblthp Mug' : 'Arcane Signet Pin',
  category: 'Accessories',
  value: { kind: 'price', amountMinor: sourceItemKey === 'item-a' ? 2500 : 1500, currency: 'USD' },
  presentationMedia: {
    decision: 'approved',
    quality: 'midsize',
    matchStatus: 'exact_product',
    mediaRole: 'product_crop',
    source: 'card',
    reviewNote: 'Crop is clear and faithful.',
  },
  availability: {
    status: 'available',
    observedAt: '2026-11-13T17:45:00-05:00',
    eventDay: '2026-11-13',
    quantitySeen: 4,
  },
  reviewedBy: 'operator-kavi',
  reviewedAt: '2026-11-13T18:00:00-05:00',
  ...overrides,
})

const batch = (decisions: CatalogItemReviewDecision[], manifest = reviewManifest()): CatalogImportBatch => ({
  batchKey: 'atlanta-2026-friday-show-store',
  manifest,
  decisions,
})

describe('buildCatalogPromotionPlan', () => {
  it('routes weak board crops to exact-image search instead of presentation', () => {
    expect(catalogPresentationRoute({ presentation_quality: 'thumbnail_only', media: { card: 'items/item/card.webp' } })).toBe('search_required')
    expect(catalogPresentationRoute({
      presentation_quality: 'thumbnail_only',
      presentation: { source_url: 'https://official.example/item.jpg', match_status: 'exact_product' },
    })).toBe('candidate_ready')
  })
  it('builds a reviewed promotion plan from the photo intake manifest', () => {
    const result = buildCatalogPromotionPlan(batch([approvedReview('item-b'), approvedReview('item-a')]))

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.plan.sourceCapture).toMatchObject({
      identityKey: `atlanta-2026-show-store:${sha('a')}`,
      sourceSha256: sha('a'),
      originalPath: `originals/${sha('a')}.webp`,
      observedOn: '2026-11-13',
    })
    expect(result.plan.promotions.map(item => item.sourceItemKey)).toEqual(['item-a', 'item-b'])
    expect(result.plan.promotions[0]).toMatchObject({
      product: { canonicalKey: 'item-a', name: 'Fblthp Mug', category: 'Accessories' },
      offer: { value: { kind: 'price', amountMinor: 2500, currency: 'USD' }, published: true },
      presentationMedia: { path: 'items/item-a/card.webp', sha256: sha('c'), reviewStatus: 'approved' },
      reviewedObservation: { sourceRawText: 'Fblthp Mug · $25.00', reviewStatus: 'approved' },
    })
  })

  it('retains an event-local sold-out observation including zero quantity', () => {
    const result = buildCatalogPromotionPlan(batch([
      approvedReview('item-a', {
        value: { kind: 'prize_tix', cost: 5000, displayLabel: '5,000 Prize Tix' },
        availability: {
          status: 'sold_out',
          observedAt: '2026-11-14T14:15:00-05:00',
          eventDay: '2026-11-14',
          quantitySeen: 0,
          note: 'Sold-out placard visible.',
        },
      }),
    ], reviewManifest([manifestItem('item-a', 'Fblthp Mug', 2500)])))

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.plan.promotions[0].availabilityObservation).toEqual({
      availability: 'sold_out',
      observedAt: '2026-11-14T19:15:00.000Z',
      eventDay: '2026-11-14',
      quantitySeen: 0,
      note: 'Sold-out placard visible.',
    })
    expect(result.plan.promotions[0].offer.value).toEqual({ kind: 'prize_tix', cost: 5000, displayLabel: '5,000 Prize Tix' })
  })

  it('rejects a money price for a Prize Wall item', () => {
    const manifest = reviewManifest([manifestItem('item-a', 'Fblthp Mug', 2500)])
    manifest.catalog = { ...manifest.catalog, family: 'prize_wall' }
    const result = buildCatalogPromotionPlan(batch([approvedReview('item-a')], manifest))

    expect(result.status).toBe('blocked')
    if (result.status !== 'blocked') return
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'invalid_value_for_family',
      sourceItemKey: 'item-a',
    }))
  })

  it('retains rejected evidence while excluding it from promotions', () => {
    const rejected: CatalogItemReviewDecision = {
      sourceItemKey: 'item-b',
      decision: 'reject',
      reason: 'The board crop does not establish the exact pin variant.',
      identityStatus: 'ambiguous',
      reviewedBy: 'operator-kavi',
      reviewedAt: '2026-11-13T18:02:00-05:00',
    }
    const result = buildCatalogPromotionPlan(batch([rejected, approvedReview('item-a')]))

    expect(result.status).toBe('ready')
    if (result.status !== 'ready') return
    expect(result.plan.promotions.map(item => item.sourceItemKey)).toEqual(['item-a'])
    expect(result.plan.retainedReviews).toContainEqual({
      sourceItemKey: 'item-b',
      decision: 'reject',
      reason: 'The board crop does not establish the exact pin variant.',
      reviewedBy: 'operator-kavi',
      reviewedAt: '2026-11-13T23:02:00.000Z',
    })
  })

  it.each([
    ['missing decision', [approvedReview('item-a')], 'missing_review'],
    ['pending decision', [approvedReview('item-a'), { ...approvedReview('item-b'), decision: 'pending' as const }], 'unresolved_review'],
    ['ambiguous approval', [approvedReview('item-a'), approvedReview('item-b', { identityStatus: 'ambiguous' })], 'ambiguous_identity'],
  ])('blocks a batch with an unresolved item: %s', (_label, decisions, expectedCode) => {
    const result = buildCatalogPromotionPlan(batch(decisions as CatalogItemReviewDecision[]))

    expect(result.status).toBe('blocked')
    if (result.status !== 'blocked') return
    expect(result.issues).toContainEqual(expect.objectContaining({ code: expectedCode, sourceItemKey: 'item-b' }))
  })

  it.each([
    ['product identity', { productName: '' }, 'missing_product_identity'],
    ['value', { value: undefined }, 'missing_value'],
    ['media review', { presentationMedia: { decision: 'pending', quality: 'midsize', matchStatus: 'unreviewed' } }, 'missing_media_review'],
    ['availability', { availability: undefined }, 'missing_availability'],
  ])('fails closed when approved %s is missing', (_label, override, expectedCode) => {
    const decision = approvedReview('item-a', override as Partial<Extract<CatalogItemReviewDecision, { decision: 'approve' }>>)
    const result = buildCatalogPromotionPlan(batch([decision], reviewManifest([manifestItem('item-a', 'Fblthp Mug', 2500)])))

    expect(result.status).toBe('blocked')
    if (result.status !== 'blocked') return
    expect(result.issues).toContainEqual(expect.objectContaining({ code: expectedCode, sourceItemKey: 'item-a' }))
  })

  it('fails closed without exact source capture identity', () => {
    const manifest = reviewManifest([manifestItem('item-a', 'Fblthp Mug', 2500)])
    manifest.source = { ...manifest.source, original_sha256: undefined }
    const result = buildCatalogPromotionPlan(batch([approvedReview('item-a')], manifest))

    expect(result.status).toBe('blocked')
    if (result.status !== 'blocked') return
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'missing_source_identity' }))
  })

  it('produces byte-for-byte deterministic output regardless of input order', () => {
    const first = buildCatalogPromotionPlan(batch([approvedReview('item-b'), approvedReview('item-a')]))
    const reversedManifest = reviewManifest([...reviewManifest().items!].reverse())
    const second = buildCatalogPromotionPlan(batch([approvedReview('item-a'), approvedReview('item-b')], reversedManifest))

    expect(first).toEqual(second)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })

  it('never promotes fixture-only intake evidence', () => {
    const manifest = reviewManifest([manifestItem('item-a', 'Fblthp Mug', 2500)])
    manifest.catalog = { ...manifest.catalog, fixture_only: true }
    const result = buildCatalogPromotionPlan(batch([approvedReview('item-a')], manifest))

    expect(result.status).toBe('blocked')
    if (result.status !== 'blocked') return
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'fixture_catalog' }))
  })
})
