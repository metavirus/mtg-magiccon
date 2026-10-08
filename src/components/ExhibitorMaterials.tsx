type Offer = { title: string; description: string; price?: string; url?: string }
export function ExhibitorMaterials({ description, sections }: { description?: string; sections: Array<{ title: string; offers: Offer[] }> }) {
  const count = sections.reduce((total, section) => total + section.offers.length, 0)
  if (!description && !count) return null
  return <details className="object-detail-section exhibitor-materials">
    <summary>Vendor description &amp; offers{count ? ` (${count})` : ''}</summary>
    {description && <section><h3>Vendor description</h3><p>{description}</p></section>}
    {sections.filter(section => section.offers.length).map(section => <section key={section.title}>
      <h3>{section.title}</h3>
      {section.offers.map((offer, index) => <article key={`${offer.title}-${index}`}>
        <h4>{offer.title}{offer.price && !/^\$?0+(?:\.0+)?$/.test(offer.price.trim()) ? ` · Listed price ${offer.price}` : ''}</h4>
        {offer.description && <p>{offer.description}</p>}
        {offer.url && <nav className="object-resource-links"><a href={offer.url} target="_blank" rel="noreferrer">Offer details ↗</a></nav>}
      </article>)}
    </section>)}
  </details>
}
