import { useEffect, useRef, useState } from 'react'
import { downloadReceiptArtifact, type ReceiptArtifact } from '../lib/receiptArtifacts'
import { ReceiptPages } from './ReceiptPages'

type PageState = { status: 'loading' | 'failed' } | { status: 'ready'; url: string }
const pageDeadlineMs = 15_000

export function ReceiptArtifactViewer({ artifacts, ownerId, title }: { artifacts: ReceiptArtifact[]; ownerId?: string; title: string }) {
  const [pages, setPages] = useState<Record<string, PageState>>({})
  const retryPage = useRef<(artifact: ReceiptArtifact) => void>(() => {})
  useEffect(() => {
    let active = true
    const attempts = new Map<string, ReturnType<typeof setTimeout>>()
    const urls: string[] = []
    function load(artifact: ReceiptArtifact) {
      const id = artifact.id
      const update = (state: PageState) => setPages(previous => ({ ...previous, [id]: state }))
      update({ status: 'loading' })
      clearTimeout(attempts.get(id))
      const timer = setTimeout(() => {
        if (active && attempts.get(id) === timer) update({ status: 'failed' })
      }, pageDeadlineMs)
      attempts.set(id, timer)
      void downloadReceiptArtifact(artifact, ownerId).then(url => {
        clearTimeout(timer)
        if (!active || attempts.get(id) !== timer) {
          URL.revokeObjectURL(url)
          return
        }
        urls.push(url)
        update({ status: 'ready', url })
      }, () => {
        clearTimeout(timer)
        if (active && attempts.get(id) === timer) update({ status: 'failed' })
      })
    }
    retryPage.current = load
    artifacts.forEach(load)
    return () => {
      active = false
      attempts.forEach(timer => clearTimeout(timer))
      urls.forEach(url => URL.revokeObjectURL(url))
    }
    // The caller keys this viewer by owner and ordered artifact IDs.
  }, [])

  const ready = artifacts.flatMap(artifact => {
    const page = pages[artifact.id]
    return page?.status === 'ready' ? [{ url: page.url, label: artifact.display_label, mimeType: artifact.mime_type }] : []
  })
  const missing = artifacts.filter(artifact => pages[artifact.id]?.status === 'failed')
  const pending = artifacts.length - ready.length - missing.length
  return <>
    {ready.length > 0 && <ReceiptPages title={title} pages={ready} totalPages={artifacts.length} />}
    {pending > 0 && <p role="status" className="original-receipt-note">{ready.length ? 'Loading remaining pages…' : 'Loading private proof…'}</p>}
    {missing.map(artifact => <div className="receipt-proof-entry" key={artifact.id}>
      <span>{artifact.display_label} unavailable.</span>
      <button type="button" className="receipt-show-proof" aria-label={`Retry ${artifact.display_label}`} onClick={() => retryPage.current(artifact)}>Retry</button>
    </div>)}
  </>
}
