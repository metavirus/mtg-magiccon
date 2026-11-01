import { useState } from 'react'
import { ProductImageViewer } from './ProductImageViewer'

export function CatalogProductImageDetail({ src, title }: { src: string; title: string }) {
  const [image, setImage] = useState<{ title: string; imageUrl: string } | null>(null)
  return <section className="object-detail-section object-detail-image-section">
    <button type="button" className="object-detail-image-card product-image-card exhibitor-product-enlarge" aria-label={`Enlarge ${title}`} onClick={() => setImage({ title, imageUrl: src })}>
      <img src={src} alt={title} loading="lazy" />
      <span aria-hidden="true">Zoom ↗</span>
    </button>
    <ProductImageViewer image={image} onClose={() => setImage(null)} />
  </section>
}
