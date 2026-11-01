import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import type { CatalogReadModel } from './catalog'
import type { InfoTopic } from './infoKnowledge'
import { readOfflineContinuity, writeOfflineContinuityLane } from './offlineContinuity'
import { writeOfflineIdentity } from './offlineIdentity'
import { publishHydrationLane } from './startupHydration'
import { catalogBrowserPreviewModel } from './catalogPreview'
import { OFFLINE_LANE_CACHE, writeOfflineLane } from './offlineLaneCache'
const startupCatalogModel: CatalogReadModel = { ...catalogBrowserPreviewModel, offers: catalogBrowserPreviewModel.offers.map(offer => ({ ...offer, event_key: 'magiccon_atlanta_2026' })) }
import App, { InfoCatalogsPreview } from '../App'

const mocked = vi.hoisted(() => ({
  auth: null as null | ((event: string, session: Session | null) => void),
  info: vi.fn(), catalog: vi.fn(),
}))
vi.mock('./supabase', () => ({ supabase: {
  auth: {
    getSession: () => new Promise(() => {}),
    onAuthStateChange: (callback: typeof mocked.auth) => { mocked.auth = callback; return { data: { subscription: { unsubscribe: () => {} } } } },
  },
  from: () => {
    const pending = new Promise(() => {})
    const query: Record<string, unknown> = {}
    for (const key of ['select', 'eq', 'order', 'in', 'range', 'limit', 'single', 'maybeSingle', 'upsert']) query[key] = () => query
    query.then = pending.then.bind(pending)
    return query
  },
} }))
vi.mock('./infoKnowledge', async original => ({ ...await original<typeof import('./infoKnowledge')>(), loadInfoKnowledge: mocked.info }))
vi.mock('./catalog', async original => ({ ...await original<typeof import('./catalog')>(), loadCatalogReadModel: mocked.catalog }))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
function topic(title: string): InfoTopic {
  return { id: title, topic_key: 'hours', title, concise_answer: title, facts: [{ label: 'Friday', value: title }], sources: [], updated_at: '2026-10-31' }
}
function saved(owner: string, title: string) {
  writeOfflineIdentity({ userId: owner, email: 'kavigrace@gmail.com' })
  writeOfflineContinuityLane(owner, 'info', { topics: [topic(title)], feed: [] })
  writeOfflineContinuityLane(owner, 'selections', [{ owner_id: owner, object_id: 'onboarding-tour', selection_key: 'completed', selection_value: 'true' }])
}
function deviceLaneCache(match: (address: string) => Promise<Response | undefined>) {
  const values = new Map<string, Response>()
  const cache = {
    match: vi.fn(async (address: string) => values.get(address)?.clone() ?? await match(address)),
    put: vi.fn(async (address: string, response: Response) => { values.set(address, response.clone()) }),
  }
  const other = { match: vi.fn(async () => undefined), put: vi.fn(async () => {}) }
  const storage = { open: vi.fn(async (name: string) => name === OFFLINE_LANE_CACHE ? cache : other) } as unknown as CacheStorage
  vi.stubGlobal('caches', storage)
  return { storage, cache, values }
}
function catalog(name: string): CatalogReadModel {
  return { ...startupCatalogModel, offers: [{ ...startupCatalogModel.offers[0], product_name: name, interests: [{ ownerId: 'owner-a', personKey: 'kavi', displayName: 'Kavi', bubbleLabel: 'Ka', bubbleColor: 'blue', interested: true, note: null, updatedAt: '' }] }] }
}
function catalogResponse(name: string, savedAt = '2026-10-31T01:00:00.000Z') {
  return new Response(JSON.stringify({ version: 1, ownerId: 'owner-a', lane: 'catalog', savedAt, value: catalog(name) }))
}
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
  for (const attr of [...document.documentElement.attributes]) if (attr.name.startsWith('data-startup-cache-write-')) document.documentElement.removeAttribute(attr.name)
  document.documentElement.removeAttribute('data-startup-cache-has-catalog')
  localStorage.clear()
  mocked.info.mockReset().mockImplementation(() => new Promise(() => {}))
  mocked.catalog.mockReset().mockImplementation(() => new Promise(() => {}))
  window.history.replaceState(null, '', '/?auth=1&qa=startup#info')
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
  window.scrollTo = vi.fn()
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('startup hydration', () => {
  it.each([true, false])('paints owner saved Info before any network read settles (online=%s)', online => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
    saved('owner-a', 'Saved current hours')
    render(<App />)
    expect(screen.getByText('Saved current hours', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('Opening your field guide…')).not.toBeInTheDocument()
  })

  it('retains saved Info after refresh failure and does not substitute preview topics', async () => {
    saved('owner-a', 'Saved current hours')
    const read = deferred<{ topics: InfoTopic[]; feed: [] }>()
    mocked.info.mockReturnValue(read.promise)
    render(<App />)
    await act(async () => { read.reject(new Error('offline')) })
    expect(screen.getByText('Saved current hours', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Getting in' })).not.toBeInTheDocument()
    expect(readOfflineContinuity('owner-a')?.lanes.info).toMatchObject({ topics: [{ title: 'Saved current hours' }] })
  })

  it('publishes Store while monitoring, notes and other reads remain held', async () => {
    saved('owner-a', 'Saved current hours')
    const store = deferred<CatalogReadModel>()
    mocked.catalog.mockReturnValue(store.promise)
    render(<App />)
    await act(async () => { store.resolve({ ...startupCatalogModel, offers: [{ ...startupCatalogModel.offers[0], product_name: 'Fresh canonical product', interests: [] }] }) })
    fireEvent.click(screen.getByRole('tab', { name: 'Store' }))
    expect(screen.getByText('Fresh canonical product')).toBeInTheDocument()
    expect(readOfflineContinuity('owner-a')?.lanes.catalog).toMatchObject({ offers: [{ product_name: 'Fresh canonical product' }] })
  })

  it.each([false, true])('reports a failed Store lane immediately while unrelated reads remain held (saved=%s)', async cached => {
    saved('owner-a', 'Saved current hours')
    if (cached) writeOfflineContinuityLane('owner-a', 'catalog', { ...startupCatalogModel, offers: [{ ...startupCatalogModel.offers[0], product_name: 'Saved canonical product', interests: [] }] })
    const store = deferred<CatalogReadModel>()
    mocked.catalog.mockReturnValue(store.promise)
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Store' }))
    await act(async () => { store.resolve({ status: 'unavailable', offers: [] }) })
    expect(screen.queryByText('Loading Store…')).not.toBeInTheDocument()
    expect(screen.getByText(cached ? 'Store could not be refreshed. Showing saved items.' : 'Store could not be loaded. Try refreshing.')).toHaveAttribute('role', 'status')
    if (cached) {
      expect(screen.getByText('Saved canonical product')).toBeInTheDocument()
      expect(readOfflineContinuity('owner-a')?.lanes.catalog).toMatchObject({ offers: [{ product_name: 'Saved canonical product' }] })
    } else expect(readOfflineContinuity('owner-a')?.lanes.catalog).toBeUndefined()
  })

  it.each(['startup', 'catalog-browser'])('records quota failure without losing rendered Store only in startup QA (qa=%s)', async qa => {
    window.history.replaceState(null, '', `/?auth=1&qa=${qa}#info`)
    saved('owner-a', 'Saved current hours')
    const store = deferred<CatalogReadModel>()
    mocked.catalog.mockReturnValue(store.promise)
    const original = Storage.prototype.setItem
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key.startsWith('magiccon:offline-continuity:')) throw new DOMException('private ignored message', 'QuotaExceededError')
      original.call(this, key, value)
    })
    render(<App />)
    await act(async () => { store.resolve({ ...startupCatalogModel, offers: [{ ...startupCatalogModel.offers[0], product_name: 'Fresh retained in memory', interests: [] }] }) })
    if (qa === 'startup') fireEvent.click(screen.getByRole('tab', { name: 'Store' }))
    expect(screen.getByText('Fresh retained in memory')).toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-startup-cache-write-failed')).toBe(qa === 'startup' ? 'catalog:QuotaExceededError' : null)
    expect(document.documentElement.getAttribute('data-startup-cache-write-catalog')).toBe(qa === 'startup' ? 'QuotaExceededError' : null)
    expect(document.documentElement.getAttribute('data-startup-cache-has-catalog')).toBe(qa === 'startup' ? 'false' : null)
    expect(readOfflineContinuity('owner-a')?.lanes.catalog).toBeUndefined()
  })

  it('marks an acknowledged saved catalog when the owner snapshot binds', () => {
    saved('owner-a', 'Saved current hours')
    writeOfflineContinuityLane('owner-a', 'catalog', startupCatalogModel)
    render(<App />)
    expect(document.documentElement.getAttribute('data-startup-cache-has-catalog')).toBe('true')
  })

  it('reopens the full acknowledged Store and bookmarks offline after localStorage quota failure', async () => {
    saved('owner-a', 'Saved current hours')
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    const device = deviceLaneCache(async () => undefined)
    const complete = catalog('Offline full catalog')
    await writeOfflineLane('owner-a', 'catalog', complete, { getItem: key => localStorage.getItem(key), setItem: () => { throw new DOMException('quota', 'QuotaExceededError') } }, device.storage)
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Store' }))
    await waitFor(() => expect(screen.getByText('Offline full catalog')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Remove bookmark' })).toBeDisabled()
    expect(document.documentElement.getAttribute('data-startup-catalog-cache-source')).toBe('cache-storage')
    expect(document.documentElement.getAttribute('data-startup-cache-has-catalog')).toBe('true')
    expect(mocked.catalog).not.toHaveBeenCalled()
    const snapshot = JSON.parse(await [...device.values.values()][0].clone().text())
    expect(snapshot.value).toEqual(complete)
  })

  it.each([false, true])('never lets a delayed cache replace a newer accepted server catalog (empty=%s)', async empty => {
    saved('owner-a', 'Saved current hours')
    const held = deferred<Response | undefined>()
    deviceLaneCache(async address => address.endsWith('/catalog') ? held.promise : undefined)
    mocked.catalog.mockResolvedValue(empty ? { status: 'ready', offers: [] } : catalog('Fresh server catalog'))
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Store' }))
    await waitFor(() => expect(screen.getByText(empty ? 'No Store items yet.' : 'Fresh server catalog')).toBeInTheDocument())
    await act(async () => { held.resolve(catalogResponse('Delayed old catalog')) })
    expect(screen.queryByText('Delayed old catalog')).not.toBeInTheDocument()
    expect(screen.getByText(empty ? 'No Store items yet.' : 'Fresh server catalog')).toBeInTheDocument()
  })

  it.each(['switch', 'sign-out'])('fences a delayed private cache on %s', async action => {
    saved('owner-a', 'Owner A hours')
    const held = deferred<Response | undefined>()
    deviceLaneCache(async address => address.includes('/owner-a/') && address.endsWith('/catalog') ? held.promise : undefined)
    render(<App />)
    act(() => mocked.auth?.(action === 'switch' ? 'SIGNED_IN' : 'SIGNED_OUT', action === 'switch' ? { user: { id: 'owner-b', email: 'other@example.com', user_metadata: {} } } as Session : null))
    await act(async () => { held.resolve(catalogResponse('Private cached A catalog')) })
    expect(screen.queryByText('Private cached A catalog')).not.toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-startup-catalog-cache-source')).toBeNull()
    expect(readOfflineContinuity('owner-b')?.lanes.catalog).toBeUndefined()
  })

  it('keeps a newer per-lane local acknowledgment over an older fallback', async () => {
    saved('owner-a', 'Saved current hours')
    writeOfflineContinuityLane('owner-a', 'catalog', catalog('Newer local catalog'), localStorage, '2099-01-01T00:00:00.000Z')
    deviceLaneCache(async address => address.endsWith('/catalog') ? catalogResponse('Older fallback catalog') : undefined)
    render(<App />)
    fireEvent.click(screen.getByRole('tab', { name: 'Store' }))
    await act(async () => {})
    expect(screen.getByText('Newer local catalog')).toBeInTheDocument()
    expect(screen.queryByText('Older fallback catalog')).not.toBeInTheDocument()
    expect(document.documentElement.getAttribute('data-startup-catalog-cache-source')).toBe('local-storage')
  })

  it('rebinds saved state on owner switch and ignores a late old-owner response', async () => {
    saved('owner-a', 'Owner A saved hours')
    writeOfflineContinuityLane('owner-b', 'info', { topics: [topic('Owner B saved hours')], feed: [] })
    const oldRead = deferred<{ topics: InfoTopic[]; feed: [] }>()
    mocked.info.mockReturnValueOnce(oldRead.promise)
    render(<App />)
    await waitFor(() => expect(mocked.info).toHaveBeenCalledTimes(1))
    act(() => mocked.auth?.('SIGNED_IN', { user: { id: 'owner-b', email: 'other@example.com', user_metadata: {} } } as Session))
    expect(screen.queryByText('Owner A saved hours')).not.toBeInTheDocument()
    expect(screen.getByText('Owner B saved hours', { selector: 'strong' })).toBeInTheDocument()
    await act(async () => { oldRead.resolve({ topics: [topic('Late private A data')], feed: [] }) })
    expect(screen.queryByText('Late private A data')).not.toBeInTheDocument()
    expect(readOfflineContinuity('owner-b')?.lanes.info).toMatchObject({ topics: [{ title: 'Owner B saved hours' }] })
  })

  it('does not treat a missing saved selections lane as completed account hydration', () => {
    writeOfflineIdentity({ userId: 'owner-without-selections', email: 'kavigrace@gmail.com' })
    render(<App />)
    expect(localStorage.getItem('magiccon:onboarding-tour-seen:owner-without-selections')).toBeNull()
  })

  it('revokes the offline owner on explicit sign-out and rejects pending old reads', async () => {
    saved('owner-a', 'Owner A saved hours')
    const read = deferred<{ topics: InfoTopic[]; feed: [] }>()
    mocked.info.mockReturnValue(read.promise)
    render(<App />)
    await waitFor(() => expect(mocked.info).toHaveBeenCalledTimes(1))
    act(() => mocked.auth?.('SIGNED_OUT', null))
    await act(async () => { read.resolve({ topics: [topic('Late signed-out data')], feed: [] }) })
    expect(screen.queryByText('Owner A saved hours')).not.toBeInTheDocument()
    expect(screen.queryByText('Late signed-out data')).not.toBeInTheDocument()
    expect(localStorage.getItem('magiccon:offline-identity:v1')).toBeNull()
  })

  it('never displays historical catalogs while the Atlanta catalog is pending', () => {
    render(<InfoCatalogsPreview catalogReadModel={{ status: 'unavailable', offers: [] }} catalogBrowserQa={false} reviewOnly={false} canEditCatalogInterest={false} catalogInterestSavingOfferId={null} onToggleCatalogInterest={() => {}} onOpenObject={() => {}} />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading Store')
    expect(screen.queryByRole('tablist', { name: 'Catalog preview' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Prior-event products/)).not.toBeInTheDocument()
  })

  it('shows no production Info or flight fixture when the owner has no snapshot', () => {
    writeOfflineIdentity({ userId: 'new-owner', email: 'kavigrace@gmail.com' })
    render(<App />)
    expect(screen.queryByRole('heading', { name: 'Weekend hours' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Getting in' })).not.toBeInTheDocument()
    expect(readOfflineContinuity('new-owner')).toBeNull()
  })

  it('keeps trial bookmarks on same-owner visible resume', async () => {
    window.history.replaceState(null, '', '/?previewOwner=kavi&qa=catalog-browser#info')
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    render(<App />)
    const before = screen.queryAllByRole('button', { name: 'Remove bookmark' }).length
    fireEvent.click(screen.getAllByRole('button', { name: 'Bookmark item' })[0])
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Remove bookmark' })).toHaveLength(before + 1))
    await act(async () => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(screen.getAllByRole('button', { name: 'Remove bookmark' })).toHaveLength(before + 1)
  })

  it('measures the held-lane boundary without claiming a network benchmark', async () => {
    const store = deferred<string>()
    const monitoring = deferred<string>()
    let oldPaint: string | undefined
    let newPaint: string | undefined
    const before = Promise.allSettled([store.promise, monitoring.promise]).then(([result]) => { if (result.status === 'fulfilled') oldPaint = result.value })
    const after = publishHydrationLane(store.promise, () => true, value => { newPaint = value }, () => {})
    store.resolve('canonical Store')
    await after
    expect(newPaint).toBe('canonical Store')
    expect(oldPaint).toBeUndefined()
    monitoring.resolve('slow unrelated result')
    await before
    expect(oldPaint).toBe('canonical Store')
  })
})
