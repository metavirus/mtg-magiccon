export type InfoCatalogItem = {
  id: string
  name: string
  category: string
  value: string
  note?: string
  availability: 'precedent' | 'unknown'
}

export type InfoCatalog = {
  id: 'show-store' | 'black-lotus' | 'prize-wall'
  title: string
  description: string
  precedentEvent: string
  sourceLabel: string
  sourceUrl: string
  items: InfoCatalogItem[]
}

export const priorEventCatalogs: InfoCatalog[] = [
  {
    id: 'show-store',
    title: 'Show Store',
    description: 'A product-and-price grid based on the official MagicCon Chicago merchandise catalog.',
    precedentEvent: 'Chicago precedent',
    sourceLabel: 'Official MagicCon Chicago merchandise catalog',
    sourceUrl: 'https://mcchicago.mtgfestivals.com/en-us/experience/merch-catalog.html',
    items: [
      { id: 'show-shirt', name: 'MagicCon T-shirt', category: 'Apparel', value: '$35', availability: 'precedent' },
      { id: 'show-hoodie', name: 'MagicCon hoodie', category: 'Apparel', value: '$65', availability: 'precedent' },
      { id: 'show-jacket', name: 'MagicCon jacket', category: 'Apparel', value: '$130', availability: 'precedent' },
      { id: 'show-accessories', name: 'Pins, playmats, bags, and accessories', category: 'Accessories', value: 'Price at launch', note: 'The real catalog will split these into individual products.', availability: 'unknown' },
    ],
  },
  {
    id: 'black-lotus',
    title: 'Black Lotus Store',
    description: 'A dedicated inventory for badge-exclusive merchandise, eligibility, limits, and pickup guidance.',
    precedentEvent: 'Structure preview',
    sourceLabel: 'Prior MagicCon Black Lotus benefit pages',
    sourceUrl: 'https://mcvegas.mtgfestivals.com/content/experience-fragments/sitebuilder/rna/lightbox/magiccon/magiccon_las_vegas/_2024/black-lotus-vip/master.html',
    items: [
      { id: 'black-lotus-exclusive', name: 'Exclusive merchandise', category: 'Black Lotus', value: 'Awaiting Atlanta', note: 'Product identity, image, price, and limits arrive only from the official Atlanta catalog.', availability: 'unknown' },
      { id: 'black-lotus-access', name: 'Shopping access and pickup', category: 'Access', value: 'Awaiting Atlanta', note: 'Store window and eligibility belong with the catalog, not on every product.', availability: 'unknown' },
    ],
  },
  {
    id: 'prize-wall',
    title: 'Prize Wall',
    description: 'Browseable redemption tiers based on the official MagicCon Amsterdam Prize Wall precedent.',
    precedentEvent: 'Amsterdam precedent',
    sourceLabel: 'Official MagicCon Amsterdam Prize Wall',
    sourceUrl: 'https://mcamsterdam.mtgfestivals.com/en-us/magic-play/prize-wall.html',
    items: [
      { id: 'prize-play-booster', name: 'Play Boosters', category: 'Boosters', value: 'From 500 Prize Tix', availability: 'precedent' },
      { id: 'prize-collector-booster', name: 'Collector Boosters', category: 'Boosters', value: 'From 2,500 Prize Tix', availability: 'precedent' },
      { id: 'prize-commander', name: 'Commander preconstructed decks', category: 'Sealed product', value: 'From 5,000 Prize Tix', availability: 'precedent' },
      { id: 'prize-bundle', name: 'Bundles', category: 'Sealed product', value: 'From 6,000 Prize Tix', availability: 'precedent' },
      { id: 'prize-jumbo', name: 'Jumbo cards', category: 'Display pieces', value: 'From 20,000 Prize Tix', availability: 'precedent' },
      { id: 'prize-sheet', name: 'Uncut sheets', category: 'Display pieces', value: 'From 50,000 Prize Tix', availability: 'precedent' },
    ],
  },
]

export function infoCatalogPreviewEnabled(search: string) {
  return (new URLSearchParams(search).get('qa')?.split(',') ?? []).includes('info-catalogs')
}
