import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogPromotionPlan } from './catalogImport'
import { promoteCatalogPlan } from './catalogPromotion'

const catalogId = '11111111-1111-4111-8111-111111111111'
const captureId = '22222222-2222-4222-8222-222222222222'
const offerId = '33333333-3333-4333-8333-333333333333'

const plan = {
  schemaVersion: 1,
  batchKey: 'atlanta-2026-friday-show-store',
  catalog: { catalogKey: 'atlanta-2026-show-store', eventKey: 'magiccon_atlanta_2026', family: 'show_store', title: 'Show Store', section: 'Accessories' },
  sourceCapture: { identityKey: 'capture', captureKind: 'board_photo', intakeSourceKind: 'observed_onsite_photo', sourceLabel: 'Friday board', sourceUrl: null, sourceSha256: 'a'.repeat(64), originalFilename: 'board.webp', originalPath: `originals/${'a'.repeat(64)}.webp`, observedOn: '2026-11-13', rightsNote: null },
  retainedReviews: [],
  promotions: [{ sourceItemKey: 'loot', product: { canonicalKey: 'loot', name: 'Loot', category: 'Plush' }, variant: null, offer: { offerKey: 'loot-offer', value: { kind: 'price', amountMinor: 3500, currency: 'USD' }, purchaseLimit: null, sortOrder: 0, published: true }, reviewedObservation: { sourceName: 'Loot', sourceRawText: 'Loot · $35.00', value: { kind: 'price', amountMinor: 3500, currency: 'USD' }, reviewStatus: 'approved', reviewedBy: 'operator-kavi', reviewedAt: '2026-11-13T18:00:00Z' }, presentationMedia: { mediaRole: 'product_image', quality: 'midsize', matchStatus: 'exact_product', source: 'external', path: null, sha256: null, externalUrl: 'https://example.com/loot.jpg', sourceProvider: 'Official catalog', sourceUrl: 'https://example.com/catalog', reviewNote: null, reviewStatus: 'approved', reviewedBy: 'operator-kavi', reviewedAt: '2026-11-13T18:00:00Z' }, availabilityObservation: { availability: 'available', observedAt: '2026-11-13T18:00:00Z', eventDay: '2026-11-13', quantitySeen: null, note: null } }],
} satisfies CatalogPromotionPlan

function clientWith(data: unknown, error: unknown = null) {
  return { rpc: vi.fn().mockResolvedValue({ data, error }) } as unknown as SupabaseClient
}

describe('promoteCatalogPlan', () => {
  it('requires exact transaction readback before reporting applied', async () => {
    const client = clientWith({ status: 'applied', batch_key: plan.batchKey, catalog_id: catalogId, source_capture_id: captureId, promotions: [{ source_item_key: 'loot', offer_id: offerId }], promoted_count: 1, retained_review_count: 0 })
    await expect(promoteCatalogPlan(client, plan)).resolves.toMatchObject({ status: 'applied', catalog_id: catalogId })
    expect(client.rpc).toHaveBeenCalledWith('promote_catalog_batch', { p_plan: plan })
  })

  it('rejects a mismatched or incomplete readback', async () => {
    const client = clientWith({ status: 'applied', batch_key: plan.batchKey, catalog_id: catalogId, source_capture_id: captureId, promotions: [], promoted_count: 0, retained_review_count: 0 })
    await expect(promoteCatalogPlan(client, plan)).rejects.toThrow('did not match')
  })

  it('surfaces the RPC error', async () => {
    await expect(promoteCatalogPlan(clientWith(null, new Error('not authorized')), plan)).rejects.toThrow('not authorized')
  })
})
