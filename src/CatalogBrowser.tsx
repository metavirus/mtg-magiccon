import { useEffect, useMemo, useRef, useState } from 'react'
import { catalogBookmarkOptions, useCatalogBookmark } from './CatalogBookmark'
import { blackLotusPurchaseLimits, formatCatalogOfferValue, type CatalogFamily, type CatalogOffer, type CatalogReadModel } from './lib/catalog'

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
  onToggleInterest: (offer: CatalogOffer, interested: boolean) => void | Promise<unknown>
  onOpenOffer: (offer: CatalogOffer) => void
  reviewOnly?: boolean
}) {
  const browserRef = useRef<HTMLElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const toolbar = toolbarRef.current
    const browser = browserRef.current
    if (!toolbar || !browser) return
    const measure = () => browser.style.setProperty('--catalog-toolbar-height', toolbar.getBoundingClientRect().height + 'px')
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(toolbar)
    return () => observer.disconnect()
  }, [model.status, model.offers.length])
  const families = useMemo(() => [...new Set(model.offers.map(offer => offer.family))], [model.offers])
  const [family, setFamily] = useState<CatalogFamily>(() => families[0] ?? 'show_store')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [view, setView] = useState<CatalogViewFilter>('all')
  const [density, setDensity] = useState<CatalogDensity>('compact')

  useEffect(() => {
    if (!families.includes(family) && families[0]) setFamily(families[0])
  }, [families, family])

  const bookmarks = useCatalogBookmark({ model, currentOwnerId, canEditInterest, savingOfferId, onToggleInterest, focusFallback: () => toolbarRef.current?.querySelector<HTMLElement>('[aria-label="Catalog view"]') })
  const exactOffers = (offer: CatalogOffer) => catalogBookmarkOptions(model, offer)
  const savedOffers = (offer: CatalogOffer) => exactOffers(offer).filter(item => item.interests.some(interest => interest.ownerId === currentOwnerId && interest.interested))
  const unifiedStore = families.includes('show_store') && !families.includes('prize_wall')
  const [showLotusRules, setShowLotusRules] = useState(false)
  const lotusDialog = useRef<HTMLDialogElement>(null)
  const lotusLauncher = useRef<HTMLButtonElement | null>(null)
  useEffect(() => { if (showLotusRules) lotusDialog.current?.showModal(); else lotusDialog.current?.close() }, [showLotusRules])
  const lotusLimits = blackLotusPurchaseLimits(model)
  const familyOffers = unifiedStore
    ? [...new Set(model.offers.filter(offer => offer.family !== 'prize_wall').map(offer => offer.product_id))].map(productId => {
        const productOffers = model.offers.filter(offer => offer.product_id === productId)
        const primary = productOffers.some(offer => offer.family === 'show_store') ? productOffers.filter(offer => offer.family === 'show_store') : productOffers
        const first = primary[0]
        return { ...first, variant_label: primary.length > 1 ? primary.length + ' options' : first.variant_label,
          attributes: { ...first.attributes, browse_offer_ids: primary.map(offer => offer.offer_id) } }
      })
    : model.offers.filter(offer => offer.family === family)
  const categories = [...new Set(familyOffers.map(offer => offer.category))].sort()
  const normalizedQuery = query.trim().toLowerCase()
  const visibleOffers = familyOffers.filter(offer => {
    if (category !== 'all' && offer.category !== category) return false
    if (view === 'available' && !['available', 'limited', 'restocking'].includes(offer.availability)) return false
    if (view === 'sold_out' && !offer.soldOut) return false
    if (view === 'interested' && !savedOffers(offer).length) return false
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

  return <section ref={browserRef} className="catalog-browser" aria-label="Event catalogs">
    {!unifiedStore && families.length > 1 && <div className="trip-tabs catalog-family-tabs" role="tablist" aria-label="Catalog">
      {families.map(item => <button type="button" role="tab" aria-selected={family === item} className={family === item ? 'active' : ''} key={item} onClick={() => { setFamily(item); setCategory('all') }}>{familyLabels[item]}</button>)}
    </div>}

    <header className="catalog-browser-heading">
      <div><h2>{unifiedStore ? 'Store' : familyOffers[0]?.catalog_title ?? familyLabels[family]}</h2></div>
      {unifiedStore && lotusLimits.length > 0 && <button type="button" className="store-lotus-button" onClick={event => { lotusLauncher.current = event.currentTarget; setShowLotusRules(true) }}><LotusIcon />Black Lotus rules</button>}
      <span><strong>{visibleOffers.length}</strong> of {familyOffers.length} items</span>
    </header>

    <div ref={toolbarRef} className="catalog-toolbar">
      <label className="catalog-search"><span aria-hidden="true">⌕</span><input type="search" list="catalog-product-suggestions" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find an item" aria-label="Find a catalog item" /></label>
      <datalist id="catalog-product-suggestions">{familyOffers.map(offer => <option value={offer.product_name} key={offer.offer_id} />)}</datalist>
      <label className="catalog-select"><span>Type</span><select value={category} onChange={event => setCategory(event.target.value)} aria-label="Product type"><option value="all">All types</option>{categories.map(item => <option value={item} key={item}>{item}</option>)}</select></label>
      <label className="catalog-select"><span>Show</span><select value={view} onChange={event => setView(event.target.value as CatalogViewFilter)} aria-label="Catalog view"><option value="all">All items</option><option value="available">Available</option><option value="interested">Bookmarked</option><option value="sold_out">Sold out</option></select></label>
      <div className="catalog-density" role="group" aria-label="Product tile size"><button type="button" className={density === 'compact' ? 'active' : ''} aria-pressed={density === 'compact'} onClick={() => setDensity('compact')} title="Small tiles">▦</button><button type="button" className={density === 'comfortable' ? 'active' : ''} aria-pressed={density === 'comfortable'} onClick={() => setDensity('comfortable')} title="Larger tiles">▥</button></div>
    </div>

    {grouped.length ? <div className={`catalog-groups density-${density}`}>
      {grouped.map(({ group, offers }) => <details className="catalog-group" open key={group}>
        <summary><span>{group}</span><small>{offers.length} item{offers.length === 1 ? '' : 's'}</small></summary>
        <div className="catalog-product-grid">{offers.map(offer => {
          const lotus = lotusLimits.find(item => item.productId === offer.product_id)
          const saved = savedOffers(offer)
          const bubbleOffer = { ...offer, interests: [...new Map(exactOffers(offer).flatMap(item => item.interests).filter(item => item.interested).map(item => [item.ownerId, item])).values()] }
          return <article
            className={`catalog-product-card${offer.soldOut ? ' sold-out' : ''}`}
            key={offer.offer_id}
            role="button"
            tabIndex={0}
            aria-label={`Open details for ${offer.product_name}`}
            onClick={() => onOpenOffer(model.offers.find(item => item.offer_id === offer.offer_id) ?? offer)}
            onKeyDown={event => {
              if (event.target !== event.currentTarget || !['Enter', ' '].includes(event.key)) return
              event.preventDefault()
              onOpenOffer(offer)
            }}
          >
            <CatalogProductImage offer={offer} />
            <div className="catalog-product-copy">{offer.variant_label && <span>{offer.variant_label}</span>}<h3>{offer.product_name}</h3><div className="catalog-product-value"><strong>{formatCatalogOfferValue(offer)}</strong>{unifiedStore && lotus?.limit != null && <span className="store-lotus-limit" title={lotus.eventWide ? `Black Lotus: Limit ${lotus.limit} per VIP for the event across preorder and onsite` : `Black Lotus preorder limit: ${lotus.limit}`}><LotusIcon />Limit {lotus.limit}</span>}</div>{saved.some(item => item.variant_label) && <span className="catalog-saved-option">Saved: {saved.map(item => item.variant_label).filter(Boolean).join(', ')}</span>}{offer.availability !== 'unknown' && <span className={`catalog-compact-availability catalog-availability ${offer.availability}`}>{availabilityLabel(offer)}</span>}</div>
            <div className="catalog-product-state">
              {offer.availability !== 'unknown' && <span className={`catalog-availability catalog-state-availability ${offer.availability}`}>{availabilityLabel(offer)}</span>}
              <CatalogInterestBubbles offer={bubbleOffer} />
              {bookmarks.button(offer)}
            </div>
          </article>
        })}</div>
      </details>)}
    </div> : <div className="catalog-filter-empty"><strong>No items match.</strong><button type="button" onClick={() => { setQuery(''); setCategory('all'); setView('all') }}>Clear filters</button></div>}
    {bookmarks.dialog}
    <dialog ref={lotusDialog} className="store-lotus-dialog" aria-label="Black Lotus purchasing rules" onCancel={() => setShowLotusRules(false)} onClose={() => { setShowLotusRules(false); lotusLauncher.current?.focus() }} onKeyDown={event => { if (event.key === 'Tab') { event.preventDefault(); lotusDialog.current?.querySelector<HTMLButtonElement>('button')?.focus() } }}>
      <header><h2><LotusIcon />Black Lotus purchase limits</h2><button type="button" aria-label="Close Black Lotus rules" onClick={() => setShowLotusRules(false)}>×</button></header>
      <p>One preorder checkout per VIP.</p>
      <ul>{lotusLimits.map(item => <li key={item.key}><strong>{item.name}</strong>: {item.limit == null ? 'Limit pending' : item.limit + (item.eventWide ? ' per VIP for the entire event, across preorder and onsite' : ' on preorder')}</li>)}</ul>
    </dialog>
  </section>
}

function LotusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4c1.9 2 2.8 4.1 2.7 6.3 2.1-.9 4.2-.9 6.3.1-1.7 3.8-4.6 5.9-8.7 6.1h-.6c-4.1-.2-7-2.3-8.7-6.1 2.1-1 4.2-1 6.3-.1C9.2 8.1 10.1 6 12 4Z"/><path d="M12 16.4V20"/></svg>
}
