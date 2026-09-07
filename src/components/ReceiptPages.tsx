import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './ReceiptPages.css'

type Page = { url: string; label: string; mimeType: string }

/** Display the downloaded originals unchanged; zoom never rewrites evidence. */
export function ReceiptPages({ pages, title }: { pages: Page[]; title: string }) {
  const [active, setActive] = useState<number | null>(null)
  const [zoom, setZoom] = useState(100)
  const dialog = useRef<HTMLDialogElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (active === null) return
    dialog.current?.showModal()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous; opener.current?.focus() }
  }, [active === null])
  function open(index: number) {
    opener.current = document.activeElement as HTMLElement
    setZoom(100)
    setActive(index)
  }
  const page = active === null ? null : pages[active]
  return <>
    {pages.length > 0 && <div className="receipt-proof-entry">
      <button type="button" className="receipt-show-proof" onClick={() => open(0)}>Show proof <span aria-hidden="true">↗</span></button>
      <span>Original receipt · {pages.length} {pages.length === 1 ? 'page' : 'pages'}</span>
    </div>}
    <details className="receipt-page-browse">
      <summary>Browse original pages</summary>
    <div className="original-proof-stack full-email" aria-label={title}>
      {pages.map((item, index) => <figure key={item.url}>
        <button type="button" className="receipt-enlarge" onClick={() => open(index)}>Enlarge · {item.label}</button>
        {item.mimeType.startsWith('image/')
          ? <button type="button" className="receipt-page-preview" aria-label={`Enlarge ${item.label}`} onClick={() => open(index)}><img src={item.url} alt={item.label} /></button>
          : <iframe title={item.label} src={item.url} sandbox="" />}
        <figcaption>{item.label}</figcaption>
      </figure>)}
    </div>
    </details>
    {page && createPortal(<dialog ref={dialog} className="receipt-reader" aria-label={`${title} enlarged`} onCancel={event => { event.preventDefault(); setActive(null) }} onKeyDown={event => event.stopPropagation()}>
      <div className="receipt-reader-toolbar">
        <button type="button" aria-label="Previous receipt page" disabled={active === 0} onClick={() => setActive(active! - 1)}>‹</button>
        <span>{active! + 1} / {pages.length}</span>
        <button type="button" aria-label="Next receipt page" disabled={active === pages.length - 1} onClick={() => setActive(active! + 1)}>›</button>
        <button type="button" aria-label="Zoom out" disabled={zoom === 100} onClick={() => setZoom(value => Math.max(100, value - 50))}>−</button>
        <button type="button" aria-label="Fit receipt to width" onClick={() => setZoom(100)}>{zoom}%</button>
        <button type="button" aria-label="Zoom in" disabled={zoom === 300} onClick={() => setZoom(value => Math.min(300, value + 50))}>+</button>
        <button type="button" aria-label="Close enlarged receipt" onClick={() => setActive(null)}>✕</button>
      </div>
      <div className="receipt-reader-scroll" key={active}>
        {page.mimeType.startsWith('image/') ? <img style={{ width: `${zoom}%` }} src={page.url} alt={page.label} /> : <iframe title={page.label} src={page.url} sandbox="" />}
      </div>
    </dialog>, document.body)}
  </>
}
