import { useState } from 'react'

// Vendor-hosted media is optional. A failed image must not leave a broken icon
// or remove the name that identifies a booth when the device is offline.
export function ExhibitorImage({ src, name, logo = false }: { src?: string; name: string; logo?: boolean }) {
  const [failedSrc, setFailedSrc] = useState('')
  const safe = /^https?:\/\//i.test(src ?? '') || src?.startsWith('/')
  if (!safe || !src || failedSrc === src) return logo
    ? <span className="exhibitor-monogram" aria-hidden="true">{name.split(/\s+/).slice(0, 2).map(word => word[0]).join('')}</span>
    : null
  return <img className={logo ? 'exhibitor-logo' : 'exhibitor-product-image'} src={src} alt={logo ? `${name} logo` : name} loading="lazy" decoding="async" onError={() => setFailedSrc(src)} />
}
