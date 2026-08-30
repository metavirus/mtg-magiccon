import type { SupabaseClient } from '@supabase/supabase-js'

export type CatalogFamily = 'show_store' | 'black_lotus' | 'prize_wall'

export type CatalogAvailability =
  | 'available'
  | 'limited'
  | 'sold_out'
  | 'restocking'
  | 'unavailable'
  | 'unknown'

export type CatalogMediaMatchStatus =
  | 'unreviewed'
  | 'exact_product'
  | 'exact_variant'
  | 'representative'
  | 'unmatched'

export type CatalogCurrentOfferRow = {
  offer_id: string
  catalog_id: string
  event_key: string
  family: CatalogFamily
  catalog_title: string
  product_id: string
  canonical_key: string
  product_name: string
  category: string
  description: string | null
  exclusive: boolean
  variant_id: string | null
  variant_label: string | null
  sku: string | null
  attributes: Record<string, unknown> | null
  display_label: string | null
  price_amount: number | null
  currency: string | null
  prize_ticket_cost: number | null
  purchase_limit: number | null
  eligibility_note: string | null
  pickup_note: string | null
  observed_source_name: string
  observed_source_variant_label: string | null
  observed_source_raw_text: string
  offer_source_capture_id: string
  offer_reviewed_at: string
  availability: CatalogAvailability
  availability_observed_at: string | null
  availability_event_day: string | null
  availability_source_capture_id: string | null
  presentation_media_id: string | null
  presentation_bucket_id: string | null
  presentation_object_path: string | null
  presentation_external_url: string | null
  presentation_source_provider: string | null
  presentation_source_url: string | null
  presentation_match_status: CatalogMediaMatchStatus | null
  sort_order: number
}

export type CatalogPresentationMediaRow = {
  id: string
  bucket_id: string | null
  object_path: string | null
  external_url: string | null
  source_provider: string | null
  source_url: string | null
  transform_metadata: Record<string, unknown>
  mime_type: string
  width_px: number | null
  height_px: number | null
  match_status: CatalogMediaMatchStatus
}

export type CatalogInterestRow = {
  owner_id: string
  offer_id: string
  interested: boolean
  note: string | null
  updated_at: string
}

export type SetCatalogInterestInput = {
  ownerId: string
  offerId: string
  interested: boolean
  note?: string | null
}

export type CatalogCompanionRow = {
  user_id: string | null
  person_key: string
  display_name: string
  bubble_label: string
  bubble_color: string
}

export type CatalogPresentationMedia = CatalogPresentationMediaRow & {
  isSquare: boolean
}

export type CatalogCompanionInterest = {
  ownerId: string
  personKey: string | null
  displayName: string | null
  bubbleLabel: string | null
  bubbleColor: string | null
  interested: boolean
  note: string | null
  updatedAt: string
}

export type CatalogOffer = Omit<CatalogCurrentOfferRow, 'presentation_media_id'> & {
  presentationMediaId: string | null
  presentationMedia: CatalogPresentationMedia | null
  presentationUrl: string | null
  interests: CatalogCompanionInterest[]
  soldOut: boolean
}

export type CatalogReadModel = {
  status: 'ready' | 'unavailable'
  offers: CatalogOffer[]
}

export function formatCatalogOfferValue(offer: Pick<CatalogOffer, 'family' | 'prize_ticket_cost' | 'price_amount' | 'currency'>) {
  if (offer.prize_ticket_cost !== null) return `${offer.prize_ticket_cost.toLocaleString()} Prize Tix`
  if (offer.family === 'prize_wall') return 'Prize Tix pending'
  if (offer.price_amount === null) return 'Price pending'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: offer.currency ?? 'USD',
    maximumFractionDigits: offer.price_amount % 1 === 0 ? 0 : 2,
  }).format(offer.price_amount)
}

const currentOfferColumns = [
  'offer_id', 'catalog_id', 'event_key', 'family', 'catalog_title', 'product_id',
  'canonical_key', 'product_name', 'category', 'description', 'exclusive',
  'variant_id', 'variant_label', 'sku', 'attributes', 'display_label',
  'price_amount', 'currency', 'prize_ticket_cost', 'purchase_limit',
  'eligibility_note', 'pickup_note', 'observed_source_name',
  'observed_source_variant_label', 'observed_source_raw_text',
  'offer_source_capture_id', 'offer_reviewed_at', 'availability',
  'availability_observed_at', 'availability_event_day',
  'availability_source_capture_id', 'presentation_media_id',
  'presentation_bucket_id', 'presentation_object_path',
  'presentation_external_url', 'presentation_source_provider',
  'presentation_source_url', 'presentation_match_status', 'sort_order',
].join(',')

const presentationMediaColumns = [
  'id', 'bucket_id', 'object_path', 'external_url', 'source_provider', 'source_url',
  'transform_metadata', 'mime_type', 'width_px', 'height_px', 'match_status',
].join(',')

const interestColumns = 'owner_id,offer_id,interested,note,updated_at'
const companionColumns = 'user_id,person_key,display_name,bubble_label,bubble_color'

export const emptyCatalogReadModel: CatalogReadModel = {
  status: 'unavailable',
  offers: [],
}

export function normalizeCatalogReadModel(
  offerRows: CatalogCurrentOfferRow[],
  mediaRows: CatalogPresentationMediaRow[],
  interestRows: CatalogInterestRow[],
  companionRows: CatalogCompanionRow[],
): CatalogReadModel {
  const mediaById = new Map(mediaRows.map(media => [media.id, media]))
  const companionByUserId = new Map(
    companionRows.flatMap(companion => companion.user_id ? [[companion.user_id, companion] as const] : []),
  )
  const interestsByOfferId = interestRows.reduce((grouped, interest) => {
    const offerInterests = grouped.get(interest.offer_id) ?? []
    offerInterests.push(interest)
    grouped.set(interest.offer_id, offerInterests)
    return grouped
  }, new Map<string, CatalogInterestRow[]>())

  return {
    status: 'ready',
    offers: offerRows.map(row => {
      const { presentation_media_id: presentationMediaId, ...offer } = row
      const media = presentationMediaId ? mediaById.get(presentationMediaId) : undefined
      return {
        ...offer,
        presentationMediaId,
        presentationMedia: media
          ? {
              ...media,
              isSquare: media.width_px !== null
                && media.height_px !== null
                && media.width_px === media.height_px,
            }
          : null,
        presentationUrl: null,
        interests: (interestsByOfferId.get(row.offer_id) ?? []).map(interest => {
          const companion = companionByUserId.get(interest.owner_id)
          return {
            ownerId: interest.owner_id,
            personKey: companion?.person_key ?? null,
            displayName: companion?.display_name ?? null,
            bubbleLabel: companion?.bubble_label ?? null,
            bubbleColor: companion?.bubble_color ?? null,
            interested: interest.interested,
            note: interest.note,
            updatedAt: interest.updated_at,
          }
        }),
        soldOut: row.availability === 'sold_out',
      }
    }),
  }
}

export async function resolveCatalogPresentationUrl(
  client: SupabaseClient,
  media: CatalogPresentationMedia | null,
  expiresInSeconds = 60 * 60,
): Promise<string | null> {
  if (!media) return null
  if (media.external_url) return media.external_url
  if (!media.bucket_id || !media.object_path) return null

  try {
    const result = await client.storage
      .from(media.bucket_id)
      .createSignedUrl(media.object_path, expiresInSeconds)
    if (result.error || !result.data?.signedUrl) return null
    return result.data.signedUrl
  } catch {
    return null
  }
}

export async function setCatalogInterest(
  client: SupabaseClient,
  input: SetCatalogInterestInput,
): Promise<CatalogInterestRow> {
  if (!input.ownerId.trim() || !input.offerId.trim()) {
    throw new Error('Catalog interest requires an exact ownerId and offerId.')
  }

  const write: CatalogInterestRow = {
    owner_id: input.ownerId,
    offer_id: input.offerId,
    interested: input.interested,
    note: input.note ?? null,
    updated_at: new Date().toISOString(),
  }
  const result = await client
    .from('catalog_interests')
    .upsert(write, { onConflict: 'owner_id,offer_id' })
    .select(interestColumns)
    .single()

  if (result.error) throw result.error
  if (!result.data) throw new Error('Catalog interest write returned no row.')

  const readback = result.data as unknown as CatalogInterestRow
  if (
    readback.owner_id !== write.owner_id
    || readback.offer_id !== write.offer_id
    || readback.interested !== write.interested
    || readback.note !== write.note
    || readback.updated_at !== write.updated_at
  ) {
    throw new Error('Catalog interest write readback did not match the requested state.')
  }
  return readback
}

export async function loadCatalogReadModel(
  client: SupabaseClient,
  eventKey?: string,
): Promise<CatalogReadModel> {
  try {
    let currentOffersQuery = client
      .from('catalog_current_offers')
      .select(currentOfferColumns)
      .order('sort_order')

    if (eventKey) currentOffersQuery = currentOffersQuery.eq('event_key', eventKey)

    const currentOffersResult = await currentOffersQuery
    if (currentOffersResult.error) return emptyCatalogReadModel

    // This migration is intentionally allowed to be absent until its publish gate.
    // Supabase's generated Database type therefore does not know this view yet.
    const offerRows = (currentOffersResult.data ?? []) as unknown as CatalogCurrentOfferRow[]
    if (offerRows.length === 0) return { status: 'ready', offers: [] }

    const offerIds = offerRows.map(row => row.offer_id)
    const mediaIds = offerRows.flatMap(row => row.presentation_media_id ? [row.presentation_media_id] : [])

    const [mediaResult, interestsResult, companionsResult] = await Promise.all([
      mediaIds.length > 0
        ? client.from('catalog_media').select(presentationMediaColumns).in('id', mediaIds)
        : Promise.resolve({ data: [], error: null }),
      client.from('catalog_interests').select(interestColumns).in('offer_id', offerIds),
      client.from('companion_members').select(companionColumns).eq('active', true),
    ])

    if (mediaResult.error || interestsResult.error || companionsResult.error) return emptyCatalogReadModel

    const model = normalizeCatalogReadModel(
      offerRows,
      (mediaResult.data ?? []) as CatalogPresentationMediaRow[],
      (interestsResult.data ?? []) as CatalogInterestRow[],
      (companionsResult.data ?? []) as CatalogCompanionRow[],
    )
    const offers = await Promise.all(model.offers.map(async offer => ({
      ...offer,
      presentationUrl: await resolveCatalogPresentationUrl(client, offer.presentationMedia),
    })))
    return { ...model, offers }
  } catch {
    return emptyCatalogReadModel
  }
}
