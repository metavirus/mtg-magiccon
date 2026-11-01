import { useEffect, useRef, useState } from 'react'
import type { CatalogOffer, CatalogReadModel } from './lib/catalog'

export function catalogBookmarkOptions(model: CatalogReadModel, offer: CatalogOffer) {
  const ids = offer.attributes?.browse_offer_ids
  return model.offers.filter(item => Array.isArray(ids) ? ids.includes(item.offer_id) : item.product_id === offer.product_id && item.family === offer.family)
}

export function preferredCatalogBookmarkOffer(model: CatalogReadModel, offer: CatalogOffer, ownerId?: string) {
  return catalogBookmarkOptions(model, offer).find(item => item.interests.some(interest => interest.ownerId === ownerId && interest.interested)) ?? offer
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.75 4.75A1.75 1.75 0 0 1 8.5 3h7a1.75 1.75 0 0 1 1.75 1.75v15.1L12 16.65l-5.25 3.2V4.75Z" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
}

export function useCatalogBookmark({ model, currentOwnerId, canEditInterest, savingOfferId, onToggleInterest, focusFallback, scopeKey, onConfirmed }: {
  model: CatalogReadModel
  currentOwnerId?: string
  canEditInterest: boolean
  savingOfferId?: string | null
  onToggleInterest: (offer: CatalogOffer, interested: boolean) => void | Promise<unknown>
  focusFallback?: () => HTMLElement | null | undefined
  scopeKey?: string
  onConfirmed?: (offer: CatalogOffer, interested: boolean) => void
}) {
  const [choice, setChoice] = useState<{ product: CatalogOffer; offers: CatalogOffer[]; removing: boolean } | null>(null)
  const [selectedOfferId, setSelectedOfferId] = useState('')
  const [pending, setPending] = useState<{ offerId: string; interested: boolean } | null>(null)
  const [saveError, setSaveError] = useState('')
  const choiceDialog = useRef<HTMLDialogElement>(null)
  const bookmarkLauncher = useRef<HTMLButtonElement | null>(null)
  const inFlight = useRef(false)
  const restoreBookmarkFocus = useRef(false)
  useEffect(() => {
    setChoice(null)
    setSelectedOfferId('')
    setPending(null)
    setSaveError('')
    inFlight.current = false
  }, [scopeKey, currentOwnerId])
  const exactOffers = (offer: CatalogOffer) => catalogBookmarkOptions(model, offer)
  const savedOffers = (offer: CatalogOffer) => exactOffers(offer).filter(item => item.interests.some(interest => interest.ownerId === currentOwnerId && interest.interested))
  const closeChoice = () => { restoreBookmarkFocus.current = true; setChoice(null); setSelectedOfferId(''); setSaveError('') }
  useEffect(() => {
    if (choice) choiceDialog.current?.showModal()
    else {
      choiceDialog.current?.close()
      if (!pending && restoreBookmarkFocus.current) {
        restoreBookmarkFocus.current = false
        const target = bookmarkLauncher.current?.isConnected ? bookmarkLauncher.current : focusFallback?.()
        target?.focus()
      }
    }
  }, [choice, pending, model])
  useEffect(() => {
    if (!pending || !inFlight.current) return
    const offer = model.offers.find(item => item.offer_id === pending.offerId)
    const confirmed = offer?.interests.some(interest => interest.ownerId === currentOwnerId && interest.interested) === true
    if (offer && confirmed === pending.interested) {
      restoreBookmarkFocus.current = true
      setPending(null)
      inFlight.current = false
      setChoice(null)
      setSelectedOfferId('')
      onConfirmed?.(offer, pending.interested)
    }
  }, [model, currentOwnerId, pending])
  const updateBookmark = async (offer: CatalogOffer, interested: boolean) => {
    if (!canEditInterest || !currentOwnerId || inFlight.current || savingOfferId) return
    inFlight.current = true
    setSaveError('')
    setPending({ offerId: offer.offer_id, interested })
    try {
      const result = await onToggleInterest(offer, interested)
      if (result === false) throw new Error('Bookmark could not be updated. Try again.')
    } catch (error) {
      setPending(null)
      inFlight.current = false
      setSaveError(error instanceof Error ? error.message : 'Bookmark could not be updated. Try again.')
    }
  }
  const launchBookmark = (offer: CatalogOffer, launcher: HTMLButtonElement) => {
    bookmarkLauncher.current = launcher
    setSaveError('')
    const saved = savedOffers(offer)
    const options = saved.length ? saved : exactOffers(offer)
    if (options.length === 1) { void updateBookmark(options[0], !saved.length); return }
    setSelectedOfferId('')
    setChoice({ product: offer, offers: options, removing: saved.length > 0 })
  }
  return {
    button: (offer: CatalogOffer, className = '') => {
      const currentInterest = savedOffers(offer).length > 0
      const busy = !!pending || !!savingOfferId
      return <button type="button" className={`${className}${currentInterest ? ' active' : ''}`} aria-label={busy ? 'Saving bookmark' : currentInterest ? 'Remove bookmark' : 'Bookmark item'} aria-pressed={currentInterest} disabled={!currentOwnerId || !canEditInterest || busy} onClick={event => { event.stopPropagation(); launchBookmark(offer, event.currentTarget) }}><span className="catalog-interest-icon"><BookmarkIcon filled={currentInterest} /></span></button>
    },
    dialog: <>
    {saveError && !choice && <p role="alert">{saveError}</p>}
    <dialog ref={choiceDialog} className="store-lotus-dialog catalog-bookmark-dialog" aria-label={choice?.removing ? 'Remove bookmark' : 'Choose an option'} onCancel={event => { if (pending) event.preventDefault(); else closeChoice() }} onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); return }
      if (event.key !== 'Tab') return
      const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), select:not(:disabled)')]
      if (!controls.length) { event.preventDefault(); return }
      const first = controls[0], last = controls[controls.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
    }}>
      <header><h2>{choice?.removing ? 'Remove bookmark' : 'Choose an option'}</h2><button type="button" aria-label="Cancel bookmark" disabled={!!pending} onClick={closeChoice}>×</button></header>
      {choice && <><h3>{choice.product.product_name}</h3><label className="catalog-bookmark-choice">Option<select aria-label="Bookmark option" value={selectedOfferId} disabled={!!pending} onChange={event => setSelectedOfferId(event.target.value)}><option value="">Choose an option</option>{choice.offers.map(offer => <option key={offer.offer_id} value={offer.offer_id}>{offer.variant_label ?? offer.display_label ?? 'Standard'}</option>)}</select></label>
      {saveError && <p role="alert">{saveError}</p>}
      <div className="catalog-bookmark-actions"><button type="button" disabled={!!pending} onClick={closeChoice}>Cancel</button><button type="button" disabled={!selectedOfferId || !!pending || !canEditInterest || !!savingOfferId} onClick={() => { const exact = choice.offers.find(offer => offer.offer_id === selectedOfferId); if (exact) void updateBookmark(exact, !choice.removing) }}>{pending ? 'Saving…' : choice.removing ? 'Remove' : 'Save'}</button></div></>}
    </dialog>
</>,
  }
}
