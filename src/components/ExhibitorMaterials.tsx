import { ExhibitorImage } from './ExhibitorImage'
import { useEffect, useRef, useState } from 'react'
type Offer = { title: string; description: string; price?: string; url?: string; imageUrl?: string }
export function ExhibitorMaterials({ description, sections }: { description?: string; sections: Array<{ title: string; offers: Offer[] }> }) {
  const [selected, setSelected] = useState<Offer | null>(null)
  const [zoom, setZoom] = useState(1)
  const viewer = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (selected) viewer.current?.showModal()
    else viewer.current?.close()
  }, [selected])
  const count = sections.reduce((total, section) => total + section.offers.length, 0)
  if (!description && !count) return null
  const pictured = sections.flatMap(section => section.offers.filter(offer => offer.imageUrl).map(offer => ({ ...offer, section: section.title })))
  return <>
    {pictured.length > 0 && <section className="object-detail-section exhibitor-gallery" aria-label="Product images">
      <h3>Product images</h3>
      <div className="exhibitor-product-grid">{pictured.map((offer, index) => <figure key={`${offer.title}-${index}`}>
        <button type="button" className="exhibitor-product-enlarge" aria-label={`Enlarge ${offer.title}`} onClick={() => { setZoom(1); setSelected(offer) }}>
          <ExhibitorImage src={offer.imageUrl} name={offer.title} />
          <span aria-hidden="true">Zoom ↗</span>
        </button>
        <figcaption><small>{offer.section}</small><strong>{offer.title}</strong>
          {offer.price && !/^\$?0+(?:\.0+)?$/.test(offer.price.trim()) && <span>Listed price {offer.price}</span>}
        </figcaption>
      </figure>)}</div>
    </section>}
    <details className="object-detail-section exhibitor-materials">
    <summary>Vendor description &amp; offers{count ? ` (${count})` : ''}</summary>
    {description && <section><h3>Vendor description</h3><p>{description}</p></section>}
    {sections.filter(section => section.offers.length).map(section => <section key={section.title}>
      <h3>{section.title}</h3>
      {section.offers.map((offer, index) => <article className="exhibitor-offer" key={`${offer.title}-${index}`}>
        <div className="exhibitor-offer-copy">
        <h4>{offer.title}{offer.price && !/^\$?0+(?:\.0+)?$/.test(offer.price.trim()) ? ` · Listed price ${offer.price}` : ''}</h4>
        {offer.description && <p>{offer.description}</p>}
        {offer.url && <nav className="object-resource-links"><a href={offer.url} target="_blank" rel="noreferrer">Offer details ↗</a></nav>}
        </div>
      </article>)}
    </section>)}
  </details>
  <dialog ref={viewer} className="exhibitor-image-viewer" aria-label={selected ? `${selected.title} image viewer` : 'Product image viewer'} onClose={() => setSelected(null)} onCancel={event => { event.preventDefault(); setSelected(null) }} onKeyDown={event => event.stopPropagation()}>
    {selected && <>
      <header><strong>{selected.title}</strong><button type="button" aria-label="Close image viewer" onClick={() => setSelected(null)} autoFocus>×</button></header>
      <div className="exhibitor-image-tools" aria-label="Image zoom">
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))}>−</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + .5))}>+</button>
        <button type="button" onClick={() => setZoom(1)}>Fit</button>
      </div>
      <div className="exhibitor-image-scroll"><div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}><img src={selected.imageUrl} alt={selected.title} /></div></div>
    </>}
  </dialog></>
}
