import { ExhibitorImage } from './ExhibitorImage'
import { useState, type ReactNode } from 'react'
import { ProductImageViewer } from './ProductImageViewer'
type Offer = { id?: string; title: string; description: string; price?: string; url?: string; imageUrl?: string }

function exhibitorOfferAnchor(section: string, offer: Offer) {
  const identity = offer.id || JSON.stringify([offer.title, offer.url, offer.imageUrl, offer.title ? '' : offer.description])
  let hash = 2166136261
  for (const character of identity) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619)
  return `${section === 'Vendor-posted exclusives' ? 'exclusive' : 'offer'}-${(hash >>> 0).toString(16)}`
}

export function ExhibitorItemActions({ saved, canWrite, onSave, children }: {
  saved: boolean; canWrite: boolean; onSave: (saved: boolean) => Promise<void>; children: ReactNode
}) {
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)
  return <>
    <button type="button" className="exhibitor-save" aria-label={saved ? 'Remove item bookmark' : 'Bookmark item'}
      aria-pressed={saved} disabled={!canWrite || saving} onClick={async () => {
        setSaving(true)
        setFailed(false)
        try { await onSave(!saved) }
        catch { setFailed(true) }
        finally { setSaving(false) }
      }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10a1 1 0 0 1 1 1v16l-6-3.4L6 21V5a1 1 0 0 1 1-1Z" /></svg></button>
    {failed && <p role="alert">Could not update bookmark. Try again.</p>}
    {children}
  </>
}

export function ExhibitorMaterials({ description, sections, renderItemActions, focusedAnchor }: {
  description?: string; sections: Array<{ title: string; offers: Offer[] }>
  renderItemActions?: (offer: Offer, anchor: string) => ReactNode; focusedAnchor?: string
}) {
  const [selected, setSelected] = useState<Offer | null>(null)
  const count = sections.reduce((total, section) => total + section.offers.length, 0)
  if (!description && !count) return null
  const pictured = sections.flatMap(section => section.offers.filter(offer => offer.imageUrl).map(offer => ({ ...offer, section: section.title })))
  return <>
    {pictured.length > 0 && <section className="object-detail-section exhibitor-gallery" aria-label="Product images">
      <h3>Product images</h3>
      <div className="exhibitor-product-grid">{pictured.map((offer, index) => <figure key={`${offer.title}-${index}`}>
        <button type="button" className="exhibitor-product-enlarge" aria-label={`Enlarge ${offer.title}`} onClick={() => { setSelected(offer) }}>
          <ExhibitorImage src={offer.imageUrl} name={offer.title} />
          <span aria-hidden="true">Zoom ↗</span>
        </button>
        <figcaption><small>{offer.section}</small><strong>{offer.title}</strong>
          {offer.price && !/^\$?0+(?:\.0+)?$/.test(offer.price.trim()) && <span>Listed price {offer.price}</span>}
        </figcaption>
      </figure>)}</div>
    </section>}
    <details className="object-detail-section exhibitor-materials" open={focusedAnchor ? true : undefined}>
    <summary>Vendor description &amp; offers{count ? ` (${count})` : ''}</summary>
    {description && <section><h3>Vendor description</h3><p>{description}</p></section>}
    {sections.filter(section => section.offers.length).map(section => <section key={section.title}>
      <h3>{section.title}</h3>
      {section.offers.map(offer => {
        const anchor = exhibitorOfferAnchor(section.title, offer)
        return <article className="exhibitor-offer" key={anchor}>
        <div className="exhibitor-offer-copy">
        <h4>{offer.title}{offer.price && !/^\$?0+(?:\.0+)?$/.test(offer.price.trim()) ? ` · Listed price ${offer.price}` : ''}</h4>
        {offer.description && <p>{offer.description}</p>}
        {offer.url && <nav className="object-resource-links"><a href={offer.url} target="_blank" rel="noreferrer">Offer details ↗</a></nav>}
        {renderItemActions && <details open={focusedAnchor === anchor ? true : undefined}>
          <summary>Bookmark &amp; notes</summary>
          {renderItemActions(offer, anchor)}
        </details>}
        </div>
      </article>
      })}
    </section>)}
  </details>
  <ProductImageViewer image={selected} onClose={() => setSelected(null)} /></>
}
