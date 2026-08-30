import type { CatalogCurrentOfferRow, CatalogOffer, CatalogReadModel } from './catalog'

const sourcePage = 'https://mcvegas.mtgfestivals.com/en-us/merch.html'
const sourceProvider = 'Official MagicCon: Las Vegas 2026 merchandise catalog'
const catalogTitle = 'Las Vegas 2026 official precedent · not Atlanta inventory'

type PreviewInterest = {
  ownerId: string
  personKey: string
  displayName: string
  bubbleLabel: string
}

type PreviewOfferInput = {
  id: string
  name: string
  category: string
  price: number
  localImage: string
  sourceImage: string
  interests?: PreviewInterest[]
}

function previewOffer(input: PreviewOfferInput): CatalogOffer {
  const mediaId = `media-${input.id}`
  const imageSize = input.localImage.endsWith('-transparent.webp') ? 640 : 375
  const row: CatalogCurrentOfferRow = {
    offer_id: input.id,
    catalog_id: 'qa-las-vegas-2026-official-show-store',
    event_key: 'magiccon_las_vegas_2026_qa',
    family: 'show_store',
    catalog_title: catalogTitle,
    product_id: `product-${input.id}`,
    canonical_key: input.id,
    product_name: input.name,
    category: input.category,
    description: 'Historical official catalog precedent; not Atlanta 2026 inventory.',
    exclusive: false,
    variant_id: null,
    variant_label: null,
    sku: null,
    attributes: {},
    display_label: null,
    price_amount: input.price,
    currency: 'USD',
    prize_ticket_cost: null,
    purchase_limit: null,
    eligibility_note: null,
    pickup_note: null,
    observed_source_name: input.name,
    observed_source_variant_label: null,
    observed_source_raw_text: `${input.name} $${input.price.toFixed(2)}`,
    offer_source_capture_id: 'qa-vegas-2026-official-merch-page',
    offer_reviewed_at: '2026-08-29T19:00:00Z',
    // The official page proves the product and price, but does not state live stock.
    availability: 'unknown',
    availability_observed_at: null,
    availability_event_day: null,
    availability_source_capture_id: null,
    presentation_media_id: mediaId,
    presentation_bucket_id: null,
    presentation_object_path: null,
    presentation_external_url: input.localImage,
    presentation_source_provider: sourceProvider,
    presentation_source_url: input.sourceImage,
    presentation_match_status: 'exact_product',
    sort_order: 0,
  }

  return {
    ...row,
    presentationMediaId: mediaId,
    presentationMedia: {
      id: mediaId,
      bucket_id: null,
      object_path: null,
      external_url: input.localImage,
      source_provider: sourceProvider,
      source_url: input.sourceImage,
      transform_metadata: { crop_shape: 'square', source_page: sourcePage },
      mime_type: input.localImage.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      width_px: imageSize,
      height_px: imageSize,
      match_status: 'exact_product',
      isSquare: true,
    },
    presentationUrl: input.localImage,
    interests: (input.interests ?? []).map(item => ({
      ...item,
      bubbleColor: item.personKey,
      interested: true,
      note: null,
      updatedAt: '2026-08-29T19:00:00Z',
    })),
    soldOut: false,
  }
}

const vegasImageRoot = 'https://mcvegas.mtgfestivals.com/content/dam/sitebuilder/rna/mtgfestivals/mcvegas/2026/images/merch'

export const catalogBrowserPreviewOwnerId = 'preview-kavi'

export const catalogBrowserPreviewModel: CatalogReadModel = {
  status: 'ready',
  offers: [
    previewOffer({ id: 'vegas-logo-tee', name: 'MagicCon: Las Vegas 2026 Logo Unisex T-Shirt', category: 'Apparel', price: 35, localImage: '/catalog-qa/vegas-logo-tee-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-MagicCon-Las-Vegas-2026-Logo-Unisex-T-Shirt.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129221/mc-vegas-26-MagicCon-Las-Vegas-2026-Logo-Unisex-T-Shirt.jpg`, interests: [{ ownerId: 'preview-kavi', personKey: 'kavi', displayName: 'Kavi', bubbleLabel: 'Ka' }] }),
    previewOffer({ id: 'vegas-logo-hoodie', name: 'MagicCon: Las Vegas 2026 Logo Full Zip Hoodie', category: 'Apparel', price: 65, localImage: '/catalog-qa/vegas-logo-hoodie-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-MagicCon-Las-Vegas-2026-Logo-Full-Zip-Hoodie.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129208/mc-vegas-26-MagicCon-Las-Vegas-2026-Logo-Full-Zip-Hoodie.jpg` }),
    previewOffer({ id: 'vegas-soccer-jersey', name: 'MagicCon: Las Vegas 2026 Soccer Jersey', category: 'Apparel', price: 75, localImage: '/catalog-qa/vegas-soccer-jersey-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-MagicCon-Las-Vegas-Soccer-Jersey.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129232/mc-vegas-26-MagicCon-Las-Vegas-Soccer-Jersey.jpg` }),
    previewOffer({ id: 'vegas-logo-snapback', name: 'MagicCon: Las Vegas 2026 Logo Snapback Hat', category: 'Headwear', price: 35, localImage: '/catalog-qa/vegas-logo-snapback-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-MagicCon-Las-Vegas-2026-Logo-Snapback-Hat.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129217/mc-vegas-26-MagicCon-Las-Vegas-2026-Logo-Snapback-Hat.jpg` }),
    previewOffer({ id: 'vegas-logo-tote', name: 'MagicCon: Las Vegas 2026 Logo Tote', category: 'Bags', price: 15, localImage: '/catalog-qa/vegas-logo-tote-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-MagicCon-Las-Vegas-2026-Logo-Tote.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129219/mc-vegas-26-MagicCon-Las-Vegas-2026-Logo-Tote.jpg` }),
    previewOffer({ id: 'vegas-lanyard', name: 'MagicCon: Las Vegas 2026 Lanyard', category: 'Event Gear', price: 10, localImage: '/catalog-qa/vegas-lanyard-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-MagicCon-Las-Vegas-2026-Lanyard.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129206/mc-vegas-26-MagicCon-Las-Vegas-2026-Lanyard.jpg` }),
    previewOffer({ id: 'animar-arty-deck-box', name: "Gatherers' Tavern Animar ARTY Deck Box", category: 'Deck Boxes', price: 40, localImage: '/catalog-qa/animar-deck-box-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-Gatherers-Tavern-Animar-ARTY-Deck-Box.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129168/mc-vegas-26-Gatherers-Tavern-Animar-ARTY-Deck-Box.jpg`, interests: [{ ownerId: 'preview-juan', personKey: 'juan', displayName: 'Juan', bubbleLabel: 'J' }] }),
    previewOffer({ id: 'mana-rubber-coasters', name: 'Mana Symbol Rubber Coasters', category: 'Home', price: 35, localImage: '/catalog-qa/mana-rubber-coasters-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-Mana-Symbol-Rubber-Coasters.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129248/mc-vegas-26-Mana-Symbol-Rubber-Coasters.jpg` }),
    previewOffer({ id: 'geometric-rune-fan', name: 'Geometric Rune Hand Fan & Wrist Strap', category: 'Accessories', price: 30, localImage: '/catalog-qa/geometric-rune-fan-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-Geometric-Rune-Hand-Fan-Wrist-Strap.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129172/mc-vegas-26-Geometric-Rune-Hand-Fan-Wrist-Strap.jpg` }),
    previewOffer({ id: 'vegas-event-playmat', name: 'MagicCon: Las Vegas Event Playmat', category: 'Playmats', price: 25, localImage: '/catalog-qa/vegas-event-playmat-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-MagicCon-Las-Vegas-2026-Event-Playmat.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129189/mc-vegas-26-MagicCon-Las-Vegas-2026-Event-Playmat.jpg`, interests: [{ ownerId: 'preview-chris', personKey: 'chris', displayName: 'Chris', bubbleLabel: 'C' }] }),
    previewOffer({ id: 'loot-squishable', name: 'Loot Squishable', category: 'Plush', price: 35, localImage: '/catalog-qa/loot-squishable-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-Loot-Squishable.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129180/mc-vegas-26-Loot-Squishable.jpg` }),
    previewOffer({ id: 'geometric-rune-mug', name: 'Geometric Rune Mug', category: 'Drinkware', price: 25, localImage: '/catalog-qa/geometric-rune-mug-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-Geometric-Rune-Mug.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129174/mc-vegas-26-Geometric-Rune-Mug.jpg`, interests: [{ ownerId: 'preview-kavi', personKey: 'kavi', displayName: 'Kavi', bubbleLabel: 'Ka' }, { ownerId: 'preview-chris', personKey: 'chris', displayName: 'Chris', bubbleLabel: 'C' }] }),
    previewOffer({ id: 'strixhaven-collector-booster', name: 'Secrets of Strixhaven Collector Booster', category: 'Sealed Product', price: 26.99, localImage: '/catalog-qa/strixhaven-collector-booster-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-strixhaven-collector-booster.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129258/mc-vegas-26-strixhaven-collector-booster.jpg` }),
    previewOffer({ id: 'tmnt-collector-booster', name: 'Magic: The Gathering® | Teenage Mutant Ninja Turtles Collector Booster', category: 'Sealed Product', price: 37.99, localImage: '/catalog-qa/tmnt-collector-booster-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-Magic-The-Gathering-Teenage-Mutant-Ninja-Turtles-collector-booster.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129240/mc-vegas-26-Magic-The-Gathering-Teenage-Mutant-Ninja-Turtles-collector-booster.jpg` }),
    previewOffer({ id: 'tmnt-pizza-bundle', name: 'Magic: The Gathering® | Teenage Mutant Ninja Turtles Pizza Bundle', category: 'Sealed Product', price: 99.99, localImage: '/catalog-qa/tmnt-pizza-bundle-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-Magic-The-Gathering-Teenage-Mutant-Ninja-Turtles-Pizza-Bundle.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129242/mc-vegas-26-Magic-The-Gathering-Teenage-Mutant-Ninja-Turtles-Pizza-Bundle.jpg` }),
    previewOffer({ id: 'lorwyn-eclipsed-collector-booster', name: 'Lorwyn Eclipsed Collector Booster', category: 'Sealed Product', price: 26.99, localImage: '/catalog-qa/lorwyn-eclipsed-collector-booster-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-lorwyn-eclipsed-collector-booster.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129182/mc-vegas-26-lorwyn-eclipsed-collector-booster.jpg` }),
    previewOffer({ id: 'festival-in-a-box-vegas-2026', name: 'Festival in a Box: Las Vegas 2026', category: 'Sealed Product', price: 199.99, localImage: '/catalog-qa/festival-in-a-box-vegas-2026-transparent.webp', sourceImage: `${vegasImageRoot}/mc-vegas-26-festival-in-a-box.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129166/mc-vegas-26-festival-in-a-box.jpg` }),
  ],
}
