import type { CatalogImportBatch, CatalogItemReviewDecision, CatalogPhotoIntakeReviewManifest } from './catalogImport'

const sha = (character: string) => character.repeat(64)

const animarImage = 'https://mcvegas.mtgfestivals.com/content/dam/sitebuilder/rna/mtgfestivals/mcvegas/2026/images/merch/mc-vegas-26-Gatherers-Tavern-Animar-ARTY-Deck-Box.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129168/mc-vegas-26-Gatherers-Tavern-Animar-ARTY-Deck-Box.jpg'
const lootImage = 'https://mcvegas.mtgfestivals.com/content/dam/sitebuilder/rna/mtgfestivals/mcvegas/2026/images/merch/mc-vegas-26-Loot-Squishable.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129180/mc-vegas-26-Loot-Squishable.jpg'
const mugImage = 'https://mcvegas.mtgfestivals.com/content/dam/sitebuilder/rna/mtgfestivals/mcvegas/2026/images/merch/mc-vegas-26-Geometric-Rune-Mug.jpg/_jcr_content/renditions/original.image_file.375.375.file/761129174/mc-vegas-26-Geometric-Rune-Mug.jpg'
const qaAsset = (fileName: string) => new URL(`catalog-qa/${fileName}`, window.location.href).toString()

export const catalogImportPreviewManifest: CatalogPhotoIntakeReviewManifest = {
  schema_version: 1,
  catalog: {
    catalog_key: 'atlanta-2025-show-store-qa',
    family: 'show_store',
    title: 'Historical show-store intake',
    section: 'Accessories',
    event_key: 'magiccon_atlanta_2025_qa',
    fixture_only: true,
  },
  source: {
    source_kind: 'board_photo',
    source_url: 'https://www.reddit.com/r/magicTCG/comments/1nr0wtt/the_magiccon_atlanta_shop_menu/',
    source_label: 'Historical Atlanta 2025 show-store board photo',
    observed_on: '2025-09-26',
    rights_note: 'Historical QA evidence only; never eligible for canonical promotion.',
    original_filename: 'atlanta-2025-accessories-board.webp',
    original_path: `originals/${sha('a')}.webp`,
    original_sha256: sha('a'),
    rectified_sha256: sha('b'),
  },
  review_gate: { status: 'operator_review_required' },
  items: [
    {
      source_item_key: 'animar-arty-deck-box',
      name: "Gatherers' Tavern Animar ARTY Deck Box",
      display_price: '$35.00',
      currency: 'USD',
      price_minor: 3500,
      presentation_quality: 'midsize',
      presentation: { source_provider: 'Official MagicCon merchandise catalog', source_url: animarImage, match_status: 'exact_product' },
      media: { evidence: 'items/animar/evidence.webp', card: qaAsset('animar-deck-box-transparent.webp'), thumb: qaAsset('animar-deck-box-transparent.webp') },
      hashes: { evidence_sha256: sha('c'), card_sha256: sha('d'), thumb_sha256: sha('e') },
    },
    {
      source_item_key: 'loot-squishable',
      name: 'Loot Squishable',
      display_price: '$35.00',
      currency: 'USD',
      price_minor: 3500,
      presentation_quality: 'midsize',
      presentation: { source_provider: 'Official MagicCon merchandise catalog', source_url: lootImage, match_status: 'exact_product' },
      media: { evidence: 'items/loot/evidence.webp', card: qaAsset('loot-squishable-transparent.webp'), thumb: qaAsset('loot-squishable-transparent.webp') },
      hashes: { evidence_sha256: sha('f'), card_sha256: sha('0'), thumb_sha256: sha('1') },
    },
    {
      source_item_key: 'geometric-rune-mug',
      name: 'Geometric Rune Coffee Mug',
      display_price: '$25.00',
      currency: 'USD',
      price_minor: 2500,
      presentation_quality: 'midsize',
      presentation: { source_provider: 'Official MagicCon merchandise catalog', source_url: mugImage, match_status: 'exact_product' },
      media: { evidence: 'items/mug/evidence.webp', card: qaAsset('geometric-rune-mug-transparent.webp'), thumb: qaAsset('geometric-rune-mug-transparent.webp') },
      hashes: { evidence_sha256: sha('2'), card_sha256: sha('3'), thumb_sha256: sha('4') },
    },
  ],
}

const reviewBase = {
  reviewedBy: 'operator-kavi',
  reviewedAt: '2026-08-29T12:00:00-07:00',
}

const previewDecisions: CatalogItemReviewDecision[] = [
  {
    sourceItemKey: 'animar-arty-deck-box',
    decision: 'approve',
    identityStatus: 'exact_product',
    canonicalKey: 'gatherers-tavern-animar-arty-deck-box',
    offerKey: 'atlanta-2025-animar-arty-deck-box',
    productName: "Gatherers' Tavern Animar ARTY Deck Box",
    category: 'Deck Boxes',
    value: { kind: 'price', amountMinor: 3500, currency: 'USD', displayLabel: '$35.00' },
    presentationMedia: {
      decision: 'approved', quality: 'midsize', matchStatus: 'exact_product', mediaRole: 'product_image',
      source: 'external', externalUrl: animarImage, sourceProvider: 'Official MagicCon merchandise catalog', sourceUrl: animarImage,
    },
    availability: { status: 'available', observedAt: '2025-09-26T13:00:00-04:00', eventDay: '2025-09-26' },
    ...reviewBase,
  },
  {
    sourceItemKey: 'loot-squishable',
    decision: 'pending',
    identityStatus: 'exact_product',
    ...reviewBase,
  },
  {
    sourceItemKey: 'geometric-rune-mug',
    decision: 'reject',
    reason: 'QA example: source crop is retained, but this candidate is intentionally excluded.',
    identityStatus: 'exact_product',
    ...reviewBase,
  },
]

export const catalogImportPreviewBatch: CatalogImportBatch = {
  batchKey: 'atlanta-2025-show-store-qa',
  manifest: catalogImportPreviewManifest,
  decisions: previewDecisions,
}
