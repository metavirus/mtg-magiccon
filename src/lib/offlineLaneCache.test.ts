import { afterEach, describe, expect, it, vi } from 'vitest'
import { OFFLINE_LANE_CACHE, readOfflineLane, writeOfflineLane, usableOfflineLane } from './offlineLaneCache'
import { readOfflineContinuity, writeOfflineContinuityLane } from './offlineContinuity'

function memoryStorage() {
  const values = new Map<string, string>()
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) } }
}
function memoryCaches() {
  const values = new Map<string, Response>()
  const cache = { match: vi.fn(async (key: string) => values.get(key)?.clone()), put: vi.fn(async (key: string, response: Response) => { values.set(key, response.clone()) }) }
  return { values, cache, storage: { open: vi.fn(async () => cache) } as unknown as CacheStorage }
}
function quotaStorage(storage = memoryStorage()) {
  return { getItem: storage.getItem, setItem: () => { throw new DOMException('quota', 'QuotaExceededError') } }
}
afterEach(() => vi.restoreAllMocks())

describe('complete read-only continuity fallback', () => {
  it('round-trips a complete oversized lane while leaving all prior original/local lanes untouched', async () => {
    const local = memoryStorage()
    writeOfflineContinuityLane('large-owner', 'notes', [{ full: 'original note' }], local)
    writeOfflineContinuityLane('large-owner', 'walletReceipts', [{ original: 'private proof index' }], local)
    const before = [...local.values]
    const caches = memoryCaches()
    const findings = [{ id: 'complete', body: 'x'.repeat(6 * 1024 * 1024) }]
    expect(await writeOfflineLane('large-owner', 'findings', findings, quotaStorage(local), caches.storage)).toEqual({ source: 'cache-storage', localErrorName: 'QuotaExceededError' })
    expect((await readOfflineLane('large-owner', 'findings', caches.storage))?.value).toEqual(findings)
    expect([...local.values]).toEqual(before)
    expect(caches.storage.open).toHaveBeenCalledWith(OFFLINE_LANE_CACHE)
  })
  it('keeps owner/lane boundaries and rejects a wrong-owner or invalid catalog envelope', async () => {
    const caches = memoryCaches()
    await writeOfflineLane('owner-a', 'notes', ['private a'], quotaStorage(), caches.storage)
    expect(await readOfflineLane('owner-b', 'notes', caches.storage)).toBeNull()
    expect(await readOfflineLane('owner-a', 'findings', caches.storage)).toBeNull()
    const address = [...caches.values.keys()][0]
    caches.values.set(address, new Response(JSON.stringify({ version: 1, ownerId: 'wrong', lane: 'notes', savedAt: new Date().toISOString(), value: ['secret'] })))
    expect(await readOfflineLane('owner-a', 'notes', caches.storage)).toBeNull()
    expect(usableOfflineLane('catalog', { status: 'unavailable', offers: [] })).toBe(false)
    expect(usableOfflineLane('catalog', { status: 'ready', offers: [{ event_key: 'other-event' }] })).toBe(false)
    expect(usableOfflineLane('catalog', { status: 'ready', offers: [] })).toBe(true)
  })
  it('serializes same-lane puts so an older delayed save cannot replace the newer acknowledgment', async () => {
    const caches = memoryCaches()
    let release!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    caches.cache.put.mockImplementationOnce(async (key, response) => { await gate; caches.values.set(key, response.clone()) })
    const first = writeOfflineLane('ordered-owner', 'findings', ['older'], quotaStorage(), caches.storage)
    const second = writeOfflineLane('ordered-owner', 'findings', ['newer'], quotaStorage(), caches.storage)
    await Promise.resolve(); await Promise.resolve()
    expect(caches.cache.put).toHaveBeenCalledTimes(1)
    release()
    await Promise.all([first, second])
    expect((await readOfflineLane('ordered-owner', 'findings', caches.storage))?.value).toEqual(['newer'])
  })
  it('retains the previous fallback when both storage writes fail and allows a later save', async () => {
    const caches = memoryCaches()
    await writeOfflineLane('failed-owner', 'findings', ['last good'], quotaStorage(), caches.storage)
    caches.cache.put.mockRejectedValueOnce(new DOMException('cache quota', 'QuotaExceededError'))
    await expect(writeOfflineLane('failed-owner', 'findings', ['unsaved'], quotaStorage(), caches.storage)).rejects.toMatchObject({ localErrorName: 'QuotaExceededError', fallbackErrorName: 'QuotaExceededError' })
    expect((await readOfflineLane('failed-owner', 'findings', caches.storage))?.value).toEqual(['last good'])
    await writeOfflineLane('failed-owner', 'findings', ['recovered'], quotaStorage(), caches.storage)
    expect((await readOfflineLane('failed-owner', 'findings', caches.storage))?.value).toEqual(['recovered'])
  })
  it('records lane-specific acknowledgment times instead of treating unrelated writes as catalog freshness', async () => {
    const local = memoryStorage()
    await writeOfflineLane('local-owner', 'catalog', { status: 'ready', offers: [] }, local)
    const catalogTime = readOfflineContinuity('local-owner', local)?.laneSavedAt?.catalog
    writeOfflineContinuityLane('local-owner', 'notes', ['later note'], local, '2099-01-01T00:00:00.000Z')
    expect(readOfflineContinuity('local-owner', local)?.laneSavedAt?.catalog).toBe(catalogTime)
  })
})
