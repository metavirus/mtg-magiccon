import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ObjectDetailLayer } from './App'
import { preferredCatalogBookmarkOffer } from './CatalogBookmark'
import { buildAtlantaMerchReview } from './lib/atlantaMerchReview'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(cleanup)

it.each([true, false])('detail bookmarks require an exact option and reflect saved XL despite opening S (review=%s)', async review => {
  const model = buildAtlantaMerchReview({ individualVariants: true })
  if (!review) for (const offer of model.offers) offer.attributes = { ...offer.attributes, local_review: false }
  const small = model.offers.find(item => item.product_name === 'Jace Reversible Hoodie' && item.variant_label === 'S')!
  const xl = model.offers.find(item => item.product_name === small.product_name && item.variant_label === 'XL')!
  const onToggle = vi.fn(async () => {})
  const onClose = vi.fn()
  const onOpenObject = vi.fn((_detail: Parameters<typeof ObjectDetailLayer>[0]['detail']) => {})
  const props = {
    canWriteNotes: false, detail: { id: `catalog-offer-${small.offer_id}`, catalogOfferId: small.offer_id, kind: 'alert' as const, eyebrow: 'CLOTHING', title: small.product_name, summary: '' },
    notes: [], catalogOwnerId: 'me', catalogReadModel: model, canEditCatalogInterest: true, catalogInterestSavingOfferId: null,
    onToggleCatalogInterest: onToggle, onAddNote: vi.fn(), onDeleteNote: vi.fn(), onClose, onNavigate: vi.fn(), onOpenObject,
  }
  const { rerender } = render(<ObjectDetailLayer {...props} />)
  const detail = screen.getByRole('dialog', { name: small.product_name })
  expect(within(detail).getByRole('combobox', { name: 'Product option' })).toHaveValue(small.offer_id)
  fireEvent.click(within(detail).getByRole('button', { name: 'Bookmark item' }))
  const optionDialog = screen.getByRole('dialog', { name: 'Choose an option' })
  expect(within(optionDialog).getByRole('combobox')).toHaveValue('')
  expect(within(optionDialog).getByRole('button', { name: 'Save' })).toBeDisabled()
  fireEvent.keyDown(optionDialog, { key: 'Escape' })
  expect(onClose).not.toHaveBeenCalled()
  fireEvent.click(within(optionDialog).getByRole('button', { name: 'Cancel' }))
  expect(onToggle).not.toHaveBeenCalled()
  fireEvent.click(within(detail).getByRole('button', { name: 'Bookmark item' }))
  fireEvent.change(screen.getByRole('combobox', { name: 'Bookmark option' }), { target: { value: xl.offer_id } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(onToggle).toHaveBeenCalledExactlyOnceWith(xl, true)
  const updated = { ...model, offers: model.offers.map(offer => offer.offer_id === xl.offer_id ? { ...offer, interests: [{ ownerId: 'me', interested: true, personKey: 'kavi', displayName: 'Kavi', bubbleLabel: 'Ka', bubbleColor: 'blue', note: null, updatedAt: '' }] } : offer) }
  rerender(<ObjectDetailLayer {...props} catalogReadModel={updated} />)
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Choose an option' })).toBeNull())
  expect(onOpenObject).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ catalogOfferId: xl.offer_id }))
  rerender(<ObjectDetailLayer {...props} detail={onOpenObject.mock.calls[0][0]} catalogReadModel={updated} />)
  expect(within(detail).getByRole('combobox', { name: 'Product option' })).toHaveValue(xl.offer_id)
  expect(preferredCatalogBookmarkOffer(updated, small, 'me').offer_id).toBe(xl.offer_id)
  expect(preferredCatalogBookmarkOffer(updated, small, 'companion').offer_id).toBe(small.offer_id)
  rerender(<ObjectDetailLayer {...props} catalogReadModel={updated} />)
  expect(within(detail).getByRole('combobox', { name: 'Product option' })).toHaveValue(small.offer_id)
  expect(within(detail).getByText('Bookmarked').nextElementSibling).toHaveTextContent('XL')
  const remove = within(detail).getByRole('button', { name: 'Remove bookmark' })
  expect(remove).toHaveAttribute('aria-pressed', 'true')
  expect(remove).toHaveFocus()
  fireEvent.click(remove)
  expect(onToggle).toHaveBeenLastCalledWith(expect.objectContaining({ offer_id: xl.offer_id }), false)
  const removed = { ...updated, offers: updated.offers.map(offer => offer.offer_id === xl.offer_id ? { ...offer, interests: [] } : offer) }
  rerender(<ObjectDetailLayer {...props} catalogReadModel={removed} />)
  await waitFor(() => expect(onOpenObject).toHaveBeenCalledTimes(1))
  expect(within(detail).getByRole('combobox', { name: 'Product option' })).toHaveValue(small.offer_id)
  expect(within(detail).queryByText('Bookmarked')).toBeNull()
})
