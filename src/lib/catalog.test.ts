import { normalizeCatalogReadModel } from './catalogNormalization'
import type { SupabaseClient } from '@supabase/supabase-js'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { atlantaMerchMedia } from './atlantaMerchMedia'
import {
  emptyCatalogReadModel,
  formatCatalogOfferValue,
  loadCatalogReadModel,
  resolveCatalogPresentationUrl,
  setCatalogInterest,
  type CatalogCurrentOfferRow,
  type CatalogPresentationMedia,
  type CatalogPresentationMediaRow,
} from './catalog'

const offerRow: CatalogCurrentOfferRow = {
  offer_id: 'offer-1',
  catalog_id: 'catalog-1',
  event_key: 'atlanta-2026',
  family: 'show_store',
  catalog_title: 'Show Store',
  product_id: 'product-1',
  canonical_key: 'geometric-rune-mug',
  product_name: 'Geometric Rune Coffee Mug',
  category: 'Drinkware',
  description: null,
  exclusive: false,
  variant_id: null,
  variant_label: null,
  sku: null,
  attributes: null,
  display_label: null,
  price_amount: 25,
  currency: 'USD',
  prize_ticket_cost: null,
  purchase_limit: 2,
  eligibility_note: null,
  pickup_note: null,
  observed_source_name: 'Coffee Mug',
  observed_source_variant_label: null,
  observed_source_raw_text: 'Coffee Mug $25',
  offer_source_capture_id: 'capture-1',
  offer_reviewed_at: '2026-08-28T22:00:00Z',
  availability: 'sold_out',
  availability_observed_at: '2026-11-13T18:30:00Z',
  availability_event_day: '2026-11-13',
  availability_source_capture_id: 'capture-2',
  presentation_media_id: 'media-1',
  presentation_bucket_id: null,
  presentation_object_path: null,
  presentation_external_url: 'https://example.com/mug.webp',
  presentation_source_provider: 'MagicCon',
  presentation_source_url: 'https://example.com/catalog',
  presentation_match_status: 'exact_product',
  sort_order: 10,
}

const mediaRow: CatalogPresentationMediaRow = {
  id: 'media-1',
  bucket_id: null,
  object_path: null,
  external_url: 'https://example.com/mug.webp',
  source_provider: 'MagicCon',
  source_url: 'https://example.com/catalog',
  transform_metadata: { crop_shape: 'square', source_width_px: 375 },
  mime_type: 'image/webp',
  width_px: 375,
  height_px: 375,
  match_status: 'exact_product',
}

const presentationMedia: CatalogPresentationMedia = {
  ...mediaRow,
  isSquare: true,
}

type QueryResult = { data: unknown[] | null; error: unknown | null }
type StorageResult = { data: { signedUrl: string } | null; error: unknown | null }

function fakeClient(results: Partial<Record<string, QueryResult | Error>>): SupabaseClient {
  return {
    from(table: string) {
      const builder = {
        select: () => builder,
        order: () => builder,
        eq: () => builder,
        in: () => builder,
        limit: () => builder,
        then(resolve: (result: QueryResult) => unknown, reject: (error: Error) => unknown) {
          const result = results[table] ?? { data: [], error: null }
          return result instanceof Error ? Promise.reject(result).then(resolve, reject) : Promise.resolve(result).then(resolve, reject)
        },
      }
      return builder
    },
  } as unknown as SupabaseClient
}

function fakeStorageClient(result: StorageResult | Error): SupabaseClient {
  return {
    storage: {
      from: () => ({
        createSignedUrl: () => result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
      }),
    },
  } as unknown as SupabaseClient
}

function fakeInterestMutationClient(mode: 'success' | 'error' | 'missing') {
  let written: Record<string, unknown> | null = null
  let conflictTarget: string | undefined
  const builder = {
    upsert(value: Record<string, unknown>, options: { onConflict?: string }) {
      written = value
      conflictTarget = options.onConflict
      return builder
    },
    select: () => builder,
    single: async () => {
      if (mode === 'error') return { data: null, error: { code: '42501', message: 'not authorized' } }
      if (mode === 'missing') return { data: null, error: null }
      return { data: written, error: null }
    },
  }
  return {
    client: { from: () => builder } as unknown as SupabaseClient,
    written: () => written,
    conflictTarget: () => conflictTarget,
  }
}

describe('catalog read model', () => {
  it('uses the verified packaged source for canonical media and preserves provenance', () => {
    const canonicalKey = 'shopify-magiccon-product-15392488980694'
    const packaged = atlantaMerchMedia(canonicalKey)!
    const canonical = { ...offerRow, canonical_key: canonicalKey, attributes: { Size: 'S' }, presentation_source_url: packaged.sourceUrl }
    const media = { ...mediaRow, source_url: packaged.sourceUrl }
    const offer = normalizeCatalogReadModel([canonical], [media], [], []).offers[0]
    expect(offer.presentationUrl).toBe(packaged.thumbnailUrl)
    expect(offer.attributes).toEqual({ Size: 'S', original_image_url: packaged.originalUrl })
    expect(offer.presentationMedia?.external_url).toBe(mediaRow.external_url)
    expect(offer.presentationMedia?.source_url).toBe(packaged.sourceUrl)
    const changedSource = normalizeCatalogReadModel([canonical], [mediaRow], [], []).offers[0]
    expect(changedSource.presentationUrl).toBeNull()
    expect(changedSource.attributes).toEqual({ Size: 'S' })
  })

  it('keeps Show Store and Black Lotus facts and personal interest separate for the same variant', () => {
    const shared = { ...offerRow, product_id: 'shared-shirt', variant_id: 'large', variant_label: 'Large' }
    const model = normalizeCatalogReadModel([
      { ...shared, offer_id: 'store-shirt', availability: 'sold_out', purchase_limit: 1 },
      { ...shared, offer_id: 'lotus-shirt', catalog_id: 'lotus', family: 'black_lotus', price_amount: 20, availability: 'unknown', purchase_limit: 2 },
    ], [], [
      { owner_id: 'user-kavi', offer_id: 'store-shirt', interested: true, note: 'Gift', updated_at: '2026-10-31T00:00:00Z' },
      { owner_id: 'user-kavi', offer_id: 'lotus-shirt', interested: false, note: null, updated_at: '2026-10-31T00:00:00Z' },
    ], [])
    expect(model.offers).toHaveLength(2)
    expect(model.offers[0]).toMatchObject({ offer_id: 'store-shirt', price_amount: 25, soldOut: true, purchase_limit: 1, interests: [{ interested: true, note: 'Gift' }] })
    expect(model.offers[1]).toMatchObject({ offer_id: 'lotus-shirt', price_amount: 20, soldOut: false, purchase_limit: 2, interests: [{ interested: false, note: null }] })
  })

  it('renders Prize Wall costs with the full Prize Tix unit and never as money', () => {
    expect(formatCatalogOfferValue({ ...offerRow, family: 'prize_wall', price_amount: null, currency: null, prize_ticket_cost: 5000 })).toBe('5,000 Prize Tix')
    expect(formatCatalogOfferValue({ ...offerRow, family: 'prize_wall', price_amount: null, currency: null, prize_ticket_cost: null })).toBe('Prize Tix pending')
  })

  it('keeps store and Prize Wall offers distinct when they share one canonical product', () => {
    const storeOffer = { ...offerRow, offer_id: 'booster-store', product_id: 'booster-product', canonical_key: 'play-booster', product_name: 'Play Booster', family: 'show_store' as const, price_amount: 6, currency: 'USD', prize_ticket_cost: null }
    const prizeOffer = { ...offerRow, offer_id: 'booster-prize-wall', catalog_id: 'prize-wall-catalog', product_id: 'booster-product', canonical_key: 'play-booster', product_name: 'Play Booster', family: 'prize_wall' as const, price_amount: null, currency: null, prize_ticket_cost: 500 }

    const model = normalizeCatalogReadModel([storeOffer, prizeOffer], [], [], [])

    expect(model.offers).toHaveLength(2)
    expect(model.offers.map(offer => [offer.offer_id, formatCatalogOfferValue(offer)])).toEqual([
      ['booster-store', '$6'],
      ['booster-prize-wall', '500 Prize Tix'],
    ])
  })

  it('normalizes square presentation media, sold-out state, and per-person interests independently', () => {
    const model = normalizeCatalogReadModel(
      [offerRow],
      [mediaRow],
      [
        { owner_id: 'user-kavi', offer_id: 'offer-1', interested: true, note: 'Gift', updated_at: '2026-08-29T00:00:00Z' },
        { owner_id: 'user-juan', offer_id: 'offer-1', interested: false, note: null, updated_at: '2026-08-29T00:05:00Z' },
      ],
      [
        { user_id: 'user-kavi', person_key: 'kavi', display_name: 'Kavi', bubble_label: 'K', bubble_color: 'peach' },
        { user_id: 'user-juan', person_key: 'juan', display_name: 'Juan', bubble_label: 'J', bubble_color: 'blue' },
      ],
    )

    expect(model.offers[0].soldOut).toBe(true)
    expect(model.offers[0].availability).toBe('sold_out')
    expect(model.offers[0].presentationMedia).toMatchObject({
      width_px: 375,
      height_px: 375,
      isSquare: true,
      transform_metadata: { crop_shape: 'square', source_width_px: 375 },
    })
    expect(model.offers[0].presentationUrl).toBeNull()
    expect(model.offers[0].interests).toEqual([
      expect.objectContaining({ personKey: 'kavi', interested: true }),
      expect.objectContaining({ personKey: 'juan', interested: false }),
    ])
  })

  it('passes through a reviewed external presentation URL without using Storage', async () => {
    const client = fakeStorageClient(new Error('Storage must not be called'))
    await expect(resolveCatalogPresentationUrl(client, presentationMedia)).resolves.toBe('https://example.com/mug.webp')
  })

  it('creates a browser-renderable signed URL for private presentation media', async () => {
    const privateMedia: CatalogPresentationMedia = {
      ...presentationMedia,
      bucket_id: 'private-catalog-artifacts',
      object_path: 'capture-1/derivatives/hash.webp',
      external_url: null,
    }
    const client = fakeStorageClient({ data: { signedUrl: 'https://signed.example.com/mug.webp' }, error: null })

    await expect(resolveCatalogPresentationUrl(client, privateMedia, 900)).resolves.toBe('https://signed.example.com/mug.webp')
  })

  it.each([
    null,
    { ...presentationMedia, external_url: null, bucket_id: null, object_path: null },
  ])('returns null when presentation media has no resolvable location', async media => {
    await expect(resolveCatalogPresentationUrl(fakeStorageClient(new Error('unused')), media)).resolves.toBeNull()
  })

  it('returns null when private URL signing fails', async () => {
    const privateMedia: CatalogPresentationMedia = {
      ...presentationMedia,
      bucket_id: 'private-catalog-artifacts',
      object_path: 'capture-1/derivatives/hash.webp',
      external_url: null,
    }
    await expect(resolveCatalogPresentationUrl(
      fakeStorageClient({ data: null, error: { message: 'not authorized' } }),
      privateMedia,
    )).resolves.toBeNull()
  })

  it('upserts an explicit interested state and returns its exact readback', async () => {
    const mutation = fakeInterestMutationClient('success')
    const result = await setCatalogInterest(mutation.client, {
      ownerId: 'user-kavi',
      offerId: 'offer-1',
      interested: true,
      note: 'Gift',
    })

    expect(mutation.conflictTarget()).toBe('owner_id,offer_id')
    expect(mutation.written()).toMatchObject({
      owner_id: 'user-kavi',
      offer_id: 'offer-1',
      interested: true,
      note: 'Gift',
      updated_at: expect.any(String),
    })
    expect(result).toEqual(mutation.written())
  })

  it('preserves explicit interested=false semantics instead of deleting the row', async () => {
    const mutation = fakeInterestMutationClient('success')
    const result = await setCatalogInterest(mutation.client, {
      ownerId: 'user-juan',
      offerId: 'offer-1',
      interested: false,
    })

    expect(result).toMatchObject({
      owner_id: 'user-juan',
      offer_id: 'offer-1',
      interested: false,
      note: null,
      updated_at: expect.any(String),
    })
  })

  it('throws the Supabase error rather than claiming an interest was saved', async () => {
    const mutation = fakeInterestMutationClient('error')
    await expect(setCatalogInterest(mutation.client, {
      ownerId: 'user-kavi', offerId: 'offer-1', interested: true,
    })).rejects.toMatchObject({ code: '42501' })
  })

  it('throws when an interest write has no readback row', async () => {
    const mutation = fakeInterestMutationClient('missing')
    await expect(setCatalogInterest(mutation.client, {
      ownerId: 'user-kavi', offerId: 'offer-1', interested: true,
    })).rejects.toThrow('returned no row')
  })

  it('returns a ready empty model when no published current offers exist', async () => {
    await expect(loadCatalogReadModel(fakeClient({
      catalog_current_offers: { data: [], error: null },
    }), 'atlanta-2026')).resolves.toEqual({ status: 'ready', offers: [], purchaseRulesStatus: 'absent' })
  })

  it.each([
    { catalog_current_offers: { data: null, error: { code: '42P01', message: 'relation does not exist' } } },
    { catalog_current_offers: new Error('network unavailable') },
    {
      catalog_current_offers: { data: [offerRow], error: null },
      catalog_media: { data: null, error: { code: '42P01', message: 'relation does not exist' } },
      catalog_interests: { data: [], error: null },
      companion_members: { data: [], error: null },
    },
  ])('fails closed without fixture data when the catalog boundary is absent or errors', async results => {
    await expect(loadCatalogReadModel(fakeClient(results))).resolves.toEqual(emptyCatalogReadModel)
  })
})

it('hides the source default-option label while retaining the exact variant identity', () => {
  const model = normalizeCatalogReadModel([{ ...offerRow, variant_id: 'source-default-variant', variant_label: 'Default Title' }], [], [], [])
  expect(model.offers[0].variant_label).toBeNull()
  expect(model.offers[0].variant_id).toBe('source-default-variant')
})


describe('explicit startup catalog diagnostics', () => {
  let originalUrl: string
  const root = document.documentElement
  beforeEach(() => {
    originalUrl = window.location.href
    for (const attr of [...root.attributes]) if (attr.name.startsWith('data-startup-catalog-read-')) root.removeAttribute(attr.name)
  })
  afterEach(() => {
    window.history.replaceState(null, '', originalUrl)
    for (const attr of [...root.attributes]) if (attr.name.startsWith('data-startup-catalog-read-')) root.removeAttribute(attr.name)
  })
  it.each(['', '?qa=catalog-browser', '?qa=startup-other'])('records nothing without the exact startup QA flag (%s)', async search => {
    window.history.replaceState(null, '', `/${search}`)
    await loadCatalogReadModel(fakeClient({}))
    expect(root.getAttribute('data-startup-catalog-read-phase')).toBeNull()
  })
  it('shows a held own-loader phase immediately and records completion without extra reads', async () => {
    window.history.replaceState(null, '', '/?qa=other,startup')
    let release!: (result: QueryResult) => void
    const held = new Promise<QueryResult>(resolve => { release = resolve })
    let reads = 0
    const builder = {
      select: () => builder, order: () => builder, eq: () => builder,
      then: held.then.bind(held),
    }
    const client = { from: () => { reads += 1; return builder } } as unknown as SupabaseClient
    const read = loadCatalogReadModel(client)
    expect(root.getAttribute('data-startup-catalog-read-phase')).toBe('offers-pending')
    expect(root.getAttribute('data-startup-catalog-read-offers-ms')).toMatch(/^[0-9]+$/)
    release({ data: [], error: null })
    await read
    expect(root.getAttribute('data-startup-catalog-read-phase')).toBe('complete-ready')
    expect(reads).toBe(1)
  })
  it('records safe provider codes without messages, owner identifiers or payload', async () => {
    window.history.replaceState(null, '', '/?qa=startup')
    const result = await loadCatalogReadModel(fakeClient({ catalog_current_offers: { data: null, error: { code: 'PGRST301', message: 'PRIVATE-OWNER-TOKEN' } } }))
    expect(result.status).toBe('unavailable')
    expect(root.getAttribute('data-startup-catalog-read-phase')).toBe('offers-error')
    expect(root.getAttribute('data-startup-catalog-read-error-code')).toBe('PGRST301')
    expect(root.outerHTML).not.toContain('PRIVATE-OWNER-TOKEN')
    await loadCatalogReadModel(fakeClient({ catalog_current_offers: { data: null, error: { code: 'PRIVATE-OWNER-TOKEN' } } }))
    expect(root.getAttribute('data-startup-catalog-read-error-code')).toBe('READ_FAILED')
  })
})
