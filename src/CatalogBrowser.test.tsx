import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { CatalogBrowser } from './CatalogBrowser'
import { buildAtlantaMerchReview } from './lib/atlantaMerchReview'
afterEach(() => { cleanup(); vi.unstubAllGlobals() })
it('combines shared products once while keeping Lotus facts out of public prices and offers', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  const model = buildAtlantaMerchReview()
  const original = JSON.stringify(model)
  render(<CatalogBrowser model={model} reviewOnly canEditInterest={false} onToggleInterest={() => {}} onOpenOffer={() => {}} />)
  expect(screen.getAllByRole('button', { name: /^Open details for / })).toHaveLength(62)
  expect(screen.getByRole('button', { name: 'Open details for Festival in a Box: Atlanta 2026' })).toHaveTextContent('$249.99')
  fireEvent.click(screen.getByRole('button', { name: 'Black Lotus limits for Festival in a Box: Atlanta 2026' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText(/Limit: 2 per VIP for the event, including preorder and onsite purchases/)).toBeVisible()
  expect(within(dialog).queryByText(/unconfirmed|eligible sizes|pickup|announced/i)).toBeNull()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Close Black Lotus rules' }))
  expect(JSON.stringify(model)).toBe(original)
})

it('groups real source variants once and opens an exact option without modifying offer identities', () => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  const model = buildAtlantaMerchReview({ individualVariants: true })
  const open = vi.fn()
  render(<CatalogBrowser model={model} reviewOnly canEditInterest={false} onToggleInterest={() => {}} onOpenOffer={open} />)
  expect(model.offers.filter(offer => offer.family === 'show_store')).toHaveLength(202)
  expect(screen.getAllByRole('button', { name: /^Open details for / })).toHaveLength(62)
  fireEvent.click(screen.getByRole('button', { name: 'Open details for Jace Reversible Hoodie' }))
  const exact = open.mock.calls[0][0]
  expect(model.offers.find(offer => offer.offer_id === exact.offer_id)).toBe(exact)
  expect(exact.variant_id).toBeTruthy()
  expect(exact.variant_label).toBe('S')
})
