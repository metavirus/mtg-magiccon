import type { CatalogCompanionRow, CatalogCurrentOfferRow, CatalogInterestRow, CatalogPresentationMediaRow, CatalogReadModel } from './catalog'
import { atlantaMerchMedia } from './atlantaMerchMedia'

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
      const packaged = atlantaMerchMedia(row.canonical_key)
      const exactPackaged = packaged && media?.source_url === packaged.sourceUrl ? packaged : null
      return {
        ...offer,
        variant_label: offer.variant_label === 'Default Title' ? null : offer.variant_label,
        presentationMediaId,
        attributes: exactPackaged ? { ...offer.attributes, original_image_url: exactPackaged.originalUrl } : offer.attributes,
        presentationMedia: media
          ? {
              ...media,
              isSquare: media.width_px !== null
                && media.height_px !== null
                && media.width_px === media.height_px,
            }
          : null,
        presentationUrl: exactPackaged?.thumbnailUrl ?? null,
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
