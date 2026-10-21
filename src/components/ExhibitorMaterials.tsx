import { ExhibitorImage } from './ExhibitorImage'
type Offer = { title: string; description: string; price?: string; url?: string; imageUrl?: string }
export function ExhibitorMaterials({ description, sections }: { description?: string; sections: Array<{ title: string; offers: Offer[] }> }) {
  const count = sections.reduce((total, section) => total + section.offers.length, 0)
  if (!description && !count) return null
  const pictured = sections.flatMap(section => section.offers.filter(offer => offer.imageUrl).map(offer => ({ ...offer, section: section.title })))
  return <>
    {pictured.length > 0 && <section className="object-detail-section exhibitor-gallery" aria-label="Product images">
      <h3>Product images</h3>
      <div className="exhibitor-product-grid">{pictured.map((offer, index) => <figure key={`${offer.title}-${index}`}>
        <ExhibitorImage src={offer.imageUrl} name={offer.title} />
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
  </details></>
}
