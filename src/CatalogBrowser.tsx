import { useEffect, useMemo, useState } from 'react'
import { formatCatalogOfferValue, type CatalogFamily, type CatalogOffer, type CatalogReadModel } from './lib/catalog'

type CatalogViewFilter = 'all' | 'available' | 'interested' | 'sold_out'
type CatalogDensity = 'compact' | 'comfortable'

const familyLabels: Record<CatalogFamily, string> = {
  show_store: 'Show Store',
  black_lotus: 'Black Lotus',
  prize_wall: 'Prize Wall',
}

function interestedPeople(offer: CatalogOffer) {
  return offer.interests.filter(interest => interest.interested && interest.personKey)
}

function availabilityLabel(offer: CatalogOffer) {
  return offer.soldOut ? 'Sold out' : offer.availability === 'unknown' ? 'Status pending' : offer.availability
}

function CatalogInterestBubbles({ offer }: { offer: CatalogOffer }) {
  const interests = interestedPeople(offer)
  if (!interests.length) return null
  return <span className="person-bubbles catalog-interest-bubbles" aria-label={`${interests.map(item => item.displayName ?? item.personKey).join(', ')} interested`}>
    {interests.map(item => <span key={item.ownerId} className={`person-bubble ${item.personKey}`} title={`${item.displayName ?? item.personKey} interested`}>{item.bubbleLabel ?? item.personKey?.slice(0, 2)}</span>)}
  </span>
}

function CatalogProductImage({ offer }: { offer: CatalogOffer }) {
  return <span className="catalog-product-image">
    {offer.presentationUrl
      ? <img src={offer.presentationUrl} alt="" />
      : <span className="catalog-image-pending" aria-label="Product image pending"><b>{offer.category.slice(0, 2).toUpperCase()}</b><small>Image pending</small></span>}
  </span>
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 4.75A1.75 1.75 0 0 1 8.5 3h7a1.75 1.75 0 0 1 1.75 1.75v15.1L12 16.65l-5.25 3.2V4.75Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}

export function CatalogBrowser({
  model,
  currentOwnerId,
  canEditInterest,
  savingOfferId,
  onToggleInterest,
  onOpenOffer,
}: {
  model: CatalogReadModel
  currentOwnerId?: string
  canEditInterest: boolean
  savingOfferId?: string | null
  onToggleInterest: (offer: CatalogOffer, interested: boolean) => void
  onOpenOffer: (offer: CatalogOffer) => void
}) {
  const families = useMemo(() => [...new Set(model.offers.map(offer => offer.family))], [model.offers])
  const [family, setFamily] = useState<CatalogFamily>(() => families[0] ?? 'show_store')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [view, setView] = useState<CatalogViewFilter>('all')
  const [density, setDensity] = useState<CatalogDensity>('compact')

  useEffect(() => {
    if (!families.includes(family) && families[0]) setFamily(families[0])
  }, [families, family])

  const familyOffers = model.offers.filter(offer => offer.family === family)
  const categories = [...new Set(familyOffers.map(offer => offer.category))].sort()
  const normalizedQuery = query.trim().toLowerCase()
  const visibleOffers = familyOffers.filter(offer => {
    if (category !== 'all' && offer.category !== category) return false
    if (view === 'available' && !['available', 'limited', 'restocking'].includes(offer.availability)) return false
    if (view === 'sold_out' && !offer.soldOut) return false
    if (view === 'interested' && !interestedPeople(offer).length) return false
    if (!normalizedQuery) return true
    return [offer.product_name, offer.category, offer.variant_label, offer.description]
      .filter(Boolean)
      .some(value => String(value).toLowerCase().includes(normalizedQuery))
  })
  const grouped = [...new Set(visibleOffers.map(offer => offer.category))].sort().map(group => ({
    group,
    offers: visibleOffers.filter(offer => offer.category === group),
  }))

  if (model.status !== 'ready' || !model.offers.length) return null

  return <section className="catalog-browser" aria-label="Event catalogs">
    {families.length > 1 && <div className="info-catalog-selector catalog-family-tabs" role="tablist" aria-label="Catalog">
      {families.map(item => <button type="button" role="tab" aria-selected={family === item} className={family === item ? 'active' : ''} key={item} onClick={() => { setFamily(item); setCategory('all') }}>{familyLabels[item]}</button>)}
    </div>}

    <header className="catalog-browser-heading">
      <div><span className="eyebrow">{familyLabels[family].toUpperCase()}</span><h2>{familyOffers[0]?.catalog_title ?? familyLabels[family]}</h2></div>
      <span><strong>{visibleOffers.length}</strong> of {familyOffers.length} items</span>
    </header>

    <div className="catalog-toolbar">
      <label className="catalog-search"><span aria-hidden="true">⌕</span><input type="search" list="catalog-product-suggestions" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find an item" aria-label="Find a catalog item" /></label>
      <datalist id="catalog-product-suggestions">{familyOffers.map(offer => <option value={offer.product_name} key={offer.offer_id} />)}</datalist>
      <label className="catalog-select"><span>Type</span><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Product type"><option value="all">All types</option>{categories.map(item => <option value={item} key={item}>{item}</option>)}</select></label>
      <label className="catalog-select"><span>Show</span><select value={view} onChange={event => setView(event.target.value as CatalogViewFilter)} aria-label="Catalog view"><option value="all">Everything</option><option value="available">Available</option><option value="interested">Shopping list</option><option value="sold_out">Sold out</option></select></label>
      <div className="catalog-density" role="group" aria-label="Product tile size"><button type="button" className={density === 'compact' ? 'active' : ''} aria-pressed={density === 'compact'} onClick={() => setDensity('compact')} title="Small tiles">▦</button><button type="button" className={density === 'comfortable' ? 'active' : ''} aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')} title="Larger tiles">▥</button></div>
    </div>

    {grouped.length ? <div className={`catalog-groups density-${density}`}>
      {grouped.map(({ group, offers }) => <details className="catalog-group" open key={group}>
        <summary><span>{group}</span><small>{offers.length} item{offers.length === 1 ? '' : 's'}</small></summary>
        <div className="catalog-product-grid">{offers.map(offer => {
          const currentInterest = offer.interests.find(interest => interest.ownerId === currentOwnerId)?.interested === true
          return <article
            className={`catalog-product-card${offer.soldOut ? ' sold-out' : ''}`}
            key={offer.offer_id}
            role="button"
            tabIndex={0}
            aria-label={`Open details for ${offer.product_name}`}
            onClick={() => onOpenOffer(offer)}
            onKeyDown={event => {
              if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return
              event.preventDefault()
              onOpenOffer(offer)
            }}
          >
            <CatalogProductImage offer={offer} />
            <div className="catalog-product-copy">{offer.variant_label && <span>{offer.variant_label}</span>}<h3>{offer.product_name}</h3><strong>{formatCatalogOfferValue(offer)}</strong><span className={`catalog-compact-availability catalog-availability ${offer.availability}`}>{availabilityLabel(offer)}</span></div>
            <div className="catalog-product-state">
              <span className={`catalog-availability catalog-state-availability ${offer.availability}`}>{availabilityLabel(offer)}</span>
              <CatalogInterestBubbles offer={offer} />
              <button type="button" className={currentInterest ? 'active' : ''} aria-label={savingOfferId === offer.offer_id ? 'Saving shopping list' : currentInterest ? 'Remove from shopping list' : 'Save to shopping list'} aria-pressed={currentInterest} disabled={!currentOwnerId || !canEditInterest || savingOfferId === offer.offer_id} onClick={event => { event.stopPropagation(); onToggleInterest(offer, !currentInterest) }}><span className="catalog-interest-icon"><BookmarkIcon filled={currentInterest} /></span></button>
            </div>
          </article>
        })}</div>
      </details>)}
    </div> : <div className="catalog-filter-empty"><strong>No items match.</strong><button type="button" onClick={() => { setQuery(''); setCategory('all'); setView('all') }}>Clear filters</button></div>}
  </section>
}
