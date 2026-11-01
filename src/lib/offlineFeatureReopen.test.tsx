import { act, cleanup, render, renderHook, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ArtistsSurface, useWalletReceipts } from '../App'
import { writeOfflineLane, readOfflineLane } from './offlineLaneCache'
import { artistCardCandidates } from '../data/artistCardCandidates'

const db = vi.hoisted(() => ({ from: vi.fn() }))
vi.mock('./supabase', () => ({ supabase: db }))
vi.mock('./receiptArtifacts', async original => ({
  ...await original<typeof import('./receiptArtifacts')>(),
  auditReceiptArtifactCache: vi.fn(async (artifacts: unknown[]) => ({ expected: artifacts.length, cached: artifacts.length })),
  primeReceiptArtifactCache: vi.fn(async () => true),
}))
function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(yes => { resolve = yes })
  return { promise, resolve }
}
function device() {
  const values = new Map<string, Response>()
  const cache = {
    match: vi.fn(async (address: string) => values.get(address)?.clone()),
    put: vi.fn(async (address: string, response: Response) => { values.set(address, response.clone()) }),
  }
  const storage = { open: vi.fn(async () => cache) } as unknown as CacheStorage
  vi.stubGlobal('caches', storage)
  return { values, cache, storage }
}
const receipt = { id: 'private-receipt', title: 'Original purchase', line_items: [{ title: 'Original line', price: 15 }], receipt_artifacts: [{ id: 'proof', object_path: 'owner-a/private.pdf', display_order: 1 }] }
beforeEach(() => {
  localStorage.clear()
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
  window.history.replaceState(null, '', '/#artists')
  db.from.mockReset()
})
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('feature complete offline reopen', () => {
  it('reopens Wallet with complete lines/private artifact references and clears it on owner switch', async () => {
    const cache = device()
    await writeOfflineLane('wallet-owner-a', 'walletReceipts', [receipt])
    await writeOfflineLane('wallet-owner-b', 'walletReceipts', [])
    const hook = renderHook(({ owner }) => useWalletReceipts(owner), { initialProps: { owner: 'wallet-owner-a' } })
    await waitFor(() => expect(hook.result.current.receipts).toEqual([receipt]))
    expect(hook.result.current.proofPack).toEqual({ expected: 1, cached: 1, loading: false })
    hook.rerender({ owner: 'wallet-owner-b' })
    expect(hook.result.current.receipts).toEqual([])
    expect((await readOfflineLane('wallet-owner-a', 'walletReceipts', cache.storage))?.value).toEqual([receipt])
    expect(db.from).not.toHaveBeenCalled()
  })
  it('never replays a late Wallet snapshot after an authoritative empty server response', async () => {
    const cache = device()
    await writeOfflineLane('wallet-server', 'walletReceipts', [receipt])
    const old = [...cache.values.values()][0].clone()
    const held = deferred<Response | undefined>()
    cache.cache.match.mockImplementationOnce(() => held.promise)
    const response = deferred<{ data: unknown[]; error: null }>()
    const query = { select: vi.fn(), order: vi.fn(), then: response.promise.then.bind(response.promise) }
    query.select.mockReturnValue(query); query.order.mockReturnValue(query)
    db.from.mockReturnValue(query)
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const hook = renderHook(() => useWalletReceipts('wallet-server'))
    await waitFor(() => expect(cache.cache.match).toHaveBeenCalledTimes(2)) // seed readback + held reopen
    await act(async () => { response.resolve({ data: [], error: null }) })
    await act(async () => { held.resolve(old) })
    expect(hook.result.current.receipts).toEqual([])
    expect((await readOfflineLane('wallet-server', 'walletReceipts', cache.storage))?.value).toEqual([])
  })
  it('rejects an old Wallet owner response after switching account', async () => {
    const cache = device(), held = deferred<Response | undefined>()
    await writeOfflineLane('wallet-race-a', 'walletReceipts', [receipt])
    const old = [...cache.values.values()][0].clone()
    cache.cache.match.mockImplementationOnce(() => held.promise)
    const hook = renderHook(({ owner }) => useWalletReceipts(owner), { initialProps: { owner: 'wallet-race-a' } })
    await waitFor(() => expect(cache.cache.match).toHaveBeenCalledTimes(2))
    hook.rerender({ owner: 'wallet-race-b' })
    await act(async () => { held.resolve(old) })
    expect(hook.result.current.receipts).toEqual([])
    expect(await readOfflineLane('wallet-race-b', 'walletReceipts', cache.storage)).toBeNull()
  })
  it('reopens primary-only artist catalog/signing data and clears private cards on owner switch', async () => {
    device()
    const card = artistCardCandidates[0]
    await writeOfflineLane('artist-reopen-a', 'artistCatalog', { artists: [{ id: 'artist', title: card.artistName, signal: 'Confirmed artist', status: 'Confirmed', attendance: 'All days', facts: [], signatureTargets: [] }], cards: [card] })
    await writeOfflineLane('artist-reopen-a', 'artistSigningInterests', { [card.id]: 'want_signed' })
    const view = render(<ArtistsSurface currentPerson="Kavi" currentOwnerId="artist-reopen-a" canWrite={false} onOpenObject={() => {}} onOpenActivity={() => {}} />)
    await waitFor(() => expect(screen.getByLabelText(/Packed:/)).toBeDisabled())
    expect(screen.getByLabelText(/Signed:/)).toBeDisabled()
    view.rerender(<ArtistsSurface currentPerson="Kavi" currentOwnerId="artist-reopen-b" canWrite={false} onOpenObject={() => {}} onOpenActivity={() => {}} />)
    expect(screen.queryByLabelText(/Packed:/)).toBeNull()
    expect(screen.queryByLabelText(/Signed:/)).toBeNull()
    expect(db.from).not.toHaveBeenCalled()
  })
})
