import { useEffect, useRef, useState } from 'react'

/** Shared original-image viewer; zoom changes display only, never evidence bytes. */
export function ProductImageViewer({ image, onClose }: { image: { title: string; imageUrl?: string } | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(1)
  const viewer = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    setZoom(1)
    if (image) viewer.current?.showModal()
    else viewer.current?.close()
  }, [image])
  return (
  <dialog ref={viewer} className="exhibitor-image-viewer" aria-label={image ? `${image.title} image viewer` : 'Product image viewer'} onClose={() => onClose()} onCancel={event => { event.preventDefault(); onClose() }} onKeyDown={event => event.stopPropagation()}>
    {image && <>
      <header><strong>{image.title}</strong><button type="button" aria-label="Close image viewer" onClick={() => onClose()} autoFocus>×</button></header>
      <div className="exhibitor-image-tools" aria-label="Image zoom">
        <button type="button" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .5))}>−</button>
        <output aria-live="polite">{Math.round(zoom * 100)}%</output>
        <button type="button" aria-label="Zoom in" disabled={zoom >= 4} onClick={() => setZoom(value => Math.min(4, value + .5))}>+</button>
        <button type="button" onClick={() => setZoom(1)}>Fit</button>
      </div>
      <div className="exhibitor-image-scroll"><div style={{ width: `${zoom * 100}%`, height: `${zoom * 100}%` }}><img src={image.imageUrl} alt={image.title} /></div></div>
    </>}
  </dialog>
  )
}
