import { atlantaMerchMedia } from './atlantaMerchMedia'
import data from '../../research/merchandise/2026-10-31/normalized-merch-review.json'
import categories from '../../research/merchandise/2026-10-31/reviewed-categories.json'
import type { CatalogOffer, CatalogReadModel } from './catalog'

// Review-only projection: source identities are not approved canonical records.
// Group by product within each channel; never infer Black Lotus variants/prices.
export function buildAtlantaMerchReview(options: { individualVariants?: boolean } = {}): CatalogReadModel {
  const offers: CatalogOffer[] = []
  for (const list of data.lists) {
    const listings = data.listings.filter(item => item.listKey === list.key)
    for (const productKey of new Set(listings.map(item => item.productKey))) {
      const product = data.products.find(item => item.productKey === productKey)!
      const rows = listings.filter(item => item.productKey === productKey)
      const variantKeys = new Set(rows.flatMap(item => item.variantKey ? [item.variantKey] : []))
      const variants = data.variants.filter(item => variantKeys.has(item.variantKey))
      const prices = rows.map(item => item.price).filter(item => item !== null)
      const onePrice = prices.length === rows.length && new Set(prices.map(item => `${item.currency}:${Number(item.amount)}`)).size === 1
      const media = atlantaMerchMedia(productKey)
      const image = media?.thumbnailUrl ?? null
      const blackLotus = list.family === 'black_lotus'
      const labels = variants.map(item => item.label).filter(label => label !== 'Default Title')
      const variantLabel = blackLotus ? 'Variants pending' : labels.length ? labels.join(' · ') : null
      const limit = rows[0].purchaseLimit ?? null
      const festivalBox = product.name === 'Festival in a Box: Atlanta 2026'
      const festivalRule = festivalBox ? ' Black Lotus VIPs purchase their remaining allotment at lounge fulfillment, not the Show Store, until November 14 at 2 PM. Limit 2 per VIP for the event across preorder and onsite purchases.' : ''
      offers.push({
        offer_id: `review:${list.key}:${productKey}`,
        catalog_id: `review:${list.key}`,
        event_key: 'magiccon_atlanta_2026',
        family: blackLotus ? 'black_lotus' : 'show_store',
        catalog_title: list.title,
        product_id: productKey,
        canonical_key: productKey,
        product_name: product.name,
        category: categories.products.find(item => item.productKey === productKey)?.category ?? product.category ?? 'Uncategorized',
        description: blackLotus
          ? `Announced Black Lotus item. Price and variants are not yet confirmed.${limit && !festivalBox ? ` Preorder limit: ${limit}.` : ''} ${list.pickup ?? ''}${festivalRule}`
          : `${product.description ? `${product.description} ` : ''}Listed in the official Atlanta Show Store collection.${variants.length > 1 ? ` ${variants.length} source variants grouped here.` : ''} Live stock is unconfirmed.${festivalRule}`,
        exclusive: false,
        variant_id: null,
        variant_label: blackLotus ? variantLabel : labels.length > 1 ? `${labels.length} options` : variantLabel,
        sku: variants.length === 1 ? variants[0].sku : null,
        attributes: { local_review: true, original_image_url: media?.originalUrl ?? null, review_variant_labels: labels, source_variant_keys: [...variantKeys], source_listing_keys: rows.map(item => item.listingKey) },
        display_label: null,
        price_amount: onePrice ? Number(prices[0].amount) : null,
        currency: onePrice ? prices[0].currency : null,
        prize_ticket_cost: null,
        purchase_limit: limit,
        eligibility_note: blackLotus ? 'Black Lotus purchasing; one checkout.' : null,
        pickup_note: list.pickup ?? null,
        observed_source_name: blackLotus ? 'Official Black Lotus email · October 26' : 'Official Atlanta merchandise collection',
        observed_source_variant_label: variantLabel,
        observed_source_raw_text: product.name,
        offer_source_capture_id: rows[0].source,
        offer_reviewed_at: '',
        availability: 'unknown',
        availability_observed_at: null,
        availability_event_day: null,
        availability_source_capture_id: null,
        presentationMediaId: null,
        presentationMedia: null,
        presentationUrl: image,
        presentation_bucket_id: null,
        presentation_object_path: null,
        presentation_external_url: image,
        presentation_source_provider: image ? 'Official product image' : null,
        presentation_source_url: media?.sourceUrl ?? null,
        presentation_match_status: 'unreviewed',
        sort_order: offers.length,
        interests: [],
        soldOut: false,
      })
    }
  }
  const projected = options.individualVariants ? offers.flatMap(offer => {
    if (offer.family !== 'show_store') return [offer]
    const rows = data.listings.filter(row => row.productKey === offer.product_id && row.listKey === data.lists.find(list => list.family === 'show_store')!.key)
    return rows.map(row => {
      const variant = data.variants.find(item => item.variantKey === row.variantKey)!
      return { ...offer, offer_id: offer.offer_id + ':' + variant.variantKey, variant_id: variant.variantKey, variant_label: variant.label === 'Default Title' ? null : variant.label,
        price_amount: row.price ? Number(row.price.amount) : null, currency: row.price?.currency ?? null }
    })
  }) : offers
  return { status: 'ready', offers: projected }
}
