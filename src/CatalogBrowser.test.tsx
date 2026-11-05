import { useState, type ComponentProps } from 'react'
import { cleanup, fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { InfoCatalogsPreview, ObjectDetailLayer } from './App'
import { CatalogBrowser } from './CatalogBrowser'
import { buildAtlantaMerchReview } from './lib/atlantaMerchReview'
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} })
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
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
  const box = screen.getByRole('button', { name: 'Open details for Festival in a Box: Atlanta 2026' })
  expect(within(box).getByText('Limit 2').closest('button')).toBeNull()
  expect(within(box).getByText('Limit 2')).toHaveAttribute('title', expect.stringContaining('for the event across preorder and onsite'))
  fireEvent.click(screen.getByRole('button', { name: 'Black Lotus rules' }))
  const dialog = screen.getByRole('dialog')
  expect(within(dialog).getByText(/per VIP for the entire event, across preorder and onsite/)).toBeVisible()
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

it('retains the Black Lotus limit from the card through the drawer and its product options', () => {
  const model = buildAtlantaMerchReview({ individualVariants: true })
  const box = model.offers.find(offer => offer.family === 'show_store' && offer.product_name.startsWith('Festival in a Box'))!
  const crocs = model.offers.find(offer => offer.family === 'show_store' && /Crocs/.test(offer.product_name))!
  model.purchaseRules = {
    schemaVersion: 1, kind: 'black_lotus_purchase_rules', sourceKind: 'official_email_reviewed_synopsis',
    sourcePublicationDate: '2026-10-26', opensAt: '2026-11-02T18:00:00Z', closesAt: '2026-11-08T18:00:00Z',
    checkoutLimit: 1, pickup: 'Black Lotus lounge', rules: [],
    items: [
      { canonicalKey: box.canonical_key, name: box.product_name, purchaseLimit: 2, limitScope: 'per_vip_per_event_across_preorder_and_onsite' },
      { canonicalKey: crocs.canonical_key, name: crocs.product_name, purchaseLimit: 1, limitScope: 'preorder' },
    ],
  }
  function Store() {
    const [detail, setDetail] = useState<ComponentProps<typeof ObjectDetailLayer>['detail']>(null)
    return <>
      <InfoCatalogsPreview catalogReadModel={model} catalogBrowserQa={false} reviewOnly canEditCatalogInterest={false} catalogInterestSavingOfferId={null} onToggleCatalogInterest={() => {}} onOpenObject={setDetail} />
      <ObjectDetailLayer detail={detail} canWriteNotes={false} notes={[]} catalogReadModel={model} canEditCatalogInterest={false} catalogInterestSavingOfferId={null} onToggleCatalogInterest={() => {}} onAddNote={() => {}} onDeleteNote={() => {}} onClose={() => setDetail(null)} onNavigate={() => {}} onOpenObject={setDetail} />
    </>
  }
  render(<Store />)
  const boxCard = screen.getByRole('button', { name: `Open details for ${box.product_name}` })
  expect(boxCard).toHaveTextContent('Limit 2')
  fireEvent.click(boxCard)
  const boxDrawer = screen.getByRole('dialog', { name: box.product_name })
  expect(within(boxDrawer).getByText('Black Lotus limit').nextElementSibling).toHaveTextContent('2 per VIP across preorder and onsite purchases')
  fireEvent.click(within(boxDrawer).getByRole('button', { name: 'Close detail' }))
  const crocsCard = screen.getByRole('button', { name: `Open details for ${crocs.product_name}` })
  expect(crocsCard).toHaveTextContent('Limit 1')
  fireEvent.click(crocsCard)
  const crocsDrawer = screen.getByRole('dialog', { name: crocs.product_name })
  const options = within(crocsDrawer).getByRole<HTMLSelectElement>('combobox', { name: 'Product option' })
  const nextOption = [...options.options].find(option => option.value !== options.value)!
  fireEvent.change(options, { target: { value: nextOption.value } })
  expect(options).toHaveValue(nextOption.value)
  expect(within(crocsDrawer).getByText('Black Lotus preorder limit').nextElementSibling).toHaveTextContent('1')
})

const hoodieName = 'Open details for Jace Reversible Hoodie'
const hoodieCard = () => screen.getByRole('button', { name: hoodieName })
const savedInterest = (ownerId: string) => ({ ownerId, interested: true, personKey: 'kavi', displayName: 'Kavi', bubbleLabel: 'Ka', bubbleColor: 'blue', note: null, updatedAt: '' })

it('requires a choice, cancels without writing, saves exact XL and waits for model confirmation', async () => {
  const model = buildAtlantaMerchReview({ individualVariants: true })
  const toggle = vi.fn(async () => {})
  const props = { model, currentOwnerId: 'me', canEditInterest: true, onToggleInterest: toggle, onOpenOffer: vi.fn() }
  const { rerender } = render(<CatalogBrowser {...props} />)
  expect(within(hoodieCard()).getByText('8 options')).toBeVisible()
  const launcher = within(hoodieCard()).getByRole('button', { name: 'Bookmark item' })
  launcher.focus()
  fireEvent.click(launcher)
  expect(screen.getByRole('combobox', { name: 'Bookmark option' })).toHaveValue('')
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(toggle).not.toHaveBeenCalled()
  expect(launcher).toHaveFocus()
  fireEvent.click(launcher)
  const xl = model.offers.find(item => item.product_name === 'Jace Reversible Hoodie' && item.family === 'show_store' && item.variant_label === 'XL')!
  fireEvent.change(screen.getByRole('combobox', { name: 'Bookmark option' }), { target: { value: xl.offer_id } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  expect(toggle).toHaveBeenCalledExactlyOnceWith(xl, true)
  expect(screen.getByRole('dialog', { name: 'Choose an option' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  expect(fireEvent.keyDown(screen.getByRole('dialog', { name: 'Choose an option' }), { key: 'Tab' })).toBe(false)
  expect(launcher).toHaveAttribute('aria-pressed', 'false')
  const confirmed = { ...model, offers: model.offers.map(item => item.offer_id === xl.offer_id ? { ...item, interests: [savedInterest('me')] } : item) }
  rerender(<CatalogBrowser {...props} model={confirmed} />)
  await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Choose an option' })).toBeNull())
  expect(within(hoodieCard()).getByText('Saved: XL')).toBeVisible()
  fireEvent.click(within(hoodieCard()).getByRole('button', { name: 'Remove bookmark' }))
  expect(toggle).toHaveBeenLastCalledWith(expect.objectContaining({ offer_id: xl.offer_id }), false)
})

it('filters only current owner bookmarks and removes one selected saved variant', async () => {
  const model = buildAtlantaMerchReview({ individualVariants: true })
  const hoodie = model.offers.filter(item => item.product_name === 'Jace Reversible Hoodie' && item.family === 'show_store')
  hoodie.find(item => item.variant_label === 'S')!.interests = [savedInterest('me')]
  hoodie.find(item => item.variant_label === 'XL')!.interests = [savedInterest('me')]
  const other = model.offers.find(item => item.product_name !== hoodie[0].product_name)!
  other.interests = [savedInterest('companion')]
  const toggle = vi.fn(async () => {})
  render(<CatalogBrowser model={model} currentOwnerId="me" canEditInterest onToggleInterest={toggle} onOpenOffer={() => {}} />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Catalog view' }), { target: { value: 'interested' } })
  expect(screen.getAllByRole('button', { name: /^Open details for / })).toHaveLength(1)
  expect(within(hoodieCard()).getByText('Saved: S, XL')).toBeVisible()
  fireEvent.click(within(hoodieCard()).getByRole('button', { name: 'Remove bookmark' }))
  expect(screen.getByRole('button', { name: /^Remove$/ })).toBeDisabled()
  const xl = hoodie.find(item => item.variant_label === 'XL')!
  fireEvent.change(screen.getByRole('combobox', { name: 'Bookmark option' }), { target: { value: xl.offer_id } })
  fireEvent.click(screen.getByRole('button', { name: /^Remove$/ }))
  expect(toggle).toHaveBeenCalledExactlyOnceWith(xl, false)
})

it('keeps failed saves retryable and read-only bookmarks visible but disabled', async () => {
  const model = buildAtlantaMerchReview({ individualVariants: true })
  const props = { model, currentOwnerId: 'me', canEditInterest: true, onToggleInterest: vi.fn(async () => false), onOpenOffer: vi.fn() }
  const { rerender } = render(<CatalogBrowser {...props} />)
  fireEvent.click(within(hoodieCard()).getByRole('button', { name: 'Bookmark item' }))
  const xl = model.offers.find(item => item.product_name === 'Jace Reversible Hoodie' && item.variant_label === 'XL')!
  fireEvent.change(screen.getByRole('combobox', { name: 'Bookmark option' }), { target: { value: xl.offer_id } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Bookmark could not be updated'))
  expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  rerender(<CatalogBrowser {...props} canEditInterest={false} />)
  expect(within(hoodieCard()).getByRole('button', { name: 'Bookmark item' })).toBeDisabled()
})

it('shows an honest Bookmarked empty state when only a companion saved items', () => {
  const model = buildAtlantaMerchReview({ individualVariants: true })
  model.offers[0].interests = [savedInterest('companion')]
  render(<CatalogBrowser model={model} currentOwnerId="me" canEditInterest onToggleInterest={() => {}} onOpenOffer={() => {}} />)
  fireEvent.change(screen.getByRole('combobox', { name: 'Catalog view' }), { target: { value: 'interested' } })
  expect(screen.getByText('No items match.')).toBeVisible()
  expect(screen.queryAllByRole('button', { name: /^Open details for / })).toHaveLength(0)
  fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
  expect(screen.getAllByRole('button', { name: /^Open details for / })).toHaveLength(62)
})

it('returns focus to the view filter after removing the final filtered bookmark', async () => {
  const model = buildAtlantaMerchReview({ individualVariants: true })
  const xl = model.offers.find(item => item.product_name === 'Jace Reversible Hoodie' && item.variant_label === 'XL')!
  xl.interests = [savedInterest('me')]
  const props = { model, currentOwnerId: 'me', canEditInterest: true, onToggleInterest: vi.fn(async () => {}), onOpenOffer: vi.fn() }
  const { rerender } = render(<CatalogBrowser {...props} />)
  const view = screen.getByRole('combobox', { name: 'Catalog view' })
  fireEvent.change(view, { target: { value: 'interested' } })
  const launcher = within(hoodieCard()).getByRole('button', { name: 'Remove bookmark' })
  launcher.focus()
  fireEvent.click(launcher)
  const confirmed = { ...model, offers: model.offers.map(item => item.offer_id === xl.offer_id ? { ...item, interests: [] } : item) }
  rerender(<CatalogBrowser {...props} model={confirmed} />)
  await waitFor(() => expect(view).toHaveFocus())
  expect(screen.getByText('No items match.')).toBeVisible()
})
