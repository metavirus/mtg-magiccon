import { afterEach, describe, expect, it, vi } from 'vitest'
import { OFFLINE_LANE_CACHE, readOfflineLane, writeOfflineLane, usableOfflineLane } from './offlineLaneCache'
import { writeOfflineContinuityLane } from './offlineContinuity'

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
  it('persists personal Calendar in the owner boundary without cross-account reuse', async () => {
    const local = memoryStorage()
    const caches = memoryCaches()
    const events = [{ id: 'dinner', title: 'Private dinner', owner_id: 'calendar-owner' }]
    await writeOfflineLane('calendar-owner', 'personalCalendar', events, local, caches.storage)
    expect((await readOfflineLane('calendar-owner', 'personalCalendar', caches.storage, local))?.value).toEqual(events)
    expect(await readOfflineLane('other-owner', 'personalCalendar', caches.storage, local)).toBeNull()
  })
  it('round-trips a complete oversized lane while leaving all prior original/local lanes untouched', async () => {
    const local = memoryStorage()
    writeOfflineContinuityLane('large-owner', 'notes', [{ full: 'original note' }], local)
    writeOfflineContinuityLane('large-owner', 'walletReceipts', [{ original: 'private proof index' }], local)
    const before = [...local.values]
    const caches = memoryCaches()
    const findings = [{ id: 'complete', body: 'x'.repeat(6 * 1024 * 1024) }]
    expect(await writeOfflineLane('large-owner', 'findings', findings, quotaStorage(local), caches.storage)).toEqual({ source: 'cache-storage' })
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
    const catalogTime = (await readOfflineLane('local-owner', 'catalog', undefined, local))?.savedAt
    writeOfflineContinuityLane('local-owner', 'notes', ['later note'], local, '2099-01-01T00:00:00.000Z')
    expect((await readOfflineLane('local-owner', 'catalog', undefined, local))?.savedAt).toBe(catalogTime)
  })
})

// Capacity is scoped to complete structured result bytes, not a billed-device
// quota promise. This fake enforces shared origin local quota across keys.
describe('consolidated durability contract', () => {
  it('round-trips every complete lane together above a realistic local quota without rewriting originals', async () => {
    const local = memoryStorage(), caches = memoryCaches()
    const { ALL_OFFLINE_LANES } = await import('./offlineLaneCache')
    const original = JSON.stringify({ version: 1, ownerId: 'capacity', savedAt: '2026-01-01', lanes: { notes: ['original'] } })
    local.setItem('magiccon:offline-continuity:v1:capacity', original)
    const bounded = { getItem: local.getItem, setItem: (key: string, value: string) => {
      const bytes = [...local.values].filter(([id]) => id !== key).reduce((sum, [id, body]) => sum + 2 * (id.length + body.length), 0) + 2 * (key.length + value.length)
      if (bytes > 5 * 1024 * 1024) throw new DOMException('shared quota', 'QuotaExceededError')
      local.setItem(key, value)
    } }
    const values: Record<string, unknown> = Object.fromEntries(ALL_OFFLINE_LANES.map(lane => [lane, [{ id: lane, full: 'text'.repeat(90000) }]]))
    values.catalog = { status: 'ready', offers: Array.from({ length: 2000 }, (_, i) => ({ id: i, event_key: 'magiccon_atlanta_2026', description: 'complete product'.repeat(60), attributes: {} })) }
    values.info = { topics: [{ body: 'full article'.repeat(100000) }], feed: [] }
    values.artistCatalog = { artists: [{ id: 'artist' }], cards: [{ printingId: 'printing', original: 'full private inventory'.repeat(100000) }] }
    values.artistSigningInterests = { printing: 'want_signed' }
    values.kaviMap = '<!doctype html><html><body>Map fixture</body></html>'
    values.walletReceipts = [{ id: 'receipt', line_items: [{ title: 'Original line' }], receipt_artifacts: [{ id: 'private-proof', bucket_id: 'private', object_path: 'capacity/proof.pdf' }] }]
    values.trustSlice = null
    expect(JSON.stringify(values).length * 2).toBeGreaterThan(5 * 1024 * 1024)
    await Promise.all(ALL_OFFLINE_LANES.map(lane => writeOfflineLane('capacity', lane, values[lane], bounded, caches.storage)))
    for (const lane of ALL_OFFLINE_LANES) {
      expect((await readOfflineLane('capacity', lane, caches.storage, bounded))?.value).toEqual(values[lane])
      expect(await readOfflineLane('other-capacity-owner', lane, caches.storage, bounded)).toBeNull()
    }
    expect(local.getItem('magiccon:offline-continuity:v1:capacity')).toBe(original)
    // Primary writes store payload once per lane; local only has tiny receipts.
    expect([...local.values].filter(([key]) => key.includes('offline-lane:')).every(([, body]) => body.length < 150)).toBe(true)
    expect(caches.cache.put).toHaveBeenCalledTimes(ALL_OFFLINE_LANES.length)
  })
  it('uses independent local fallback when CacheStorage fails and preserves unrelated complete lanes', async () => {
    const local = memoryStorage(), caches = memoryCaches()
    caches.storage.open = vi.fn().mockRejectedValue(new DOMException('disabled', 'SecurityError'))
    await writeOfflineLane('local-fallback', 'walletReceipts', [{ receipt_artifacts: [{ object_path: 'original.pdf' }] }], local, caches.storage)
    await writeOfflineLane('local-fallback', 'artistSigningInterests', { printing: 'maybe' }, local, caches.storage)
    expect((await readOfflineLane('local-fallback', 'walletReceipts', caches.storage, local))?.value).toEqual([{ receipt_artifacts: [{ object_path: 'original.pdf' }] }])
    expect((await readOfflineLane('local-fallback', 'artistSigningInterests', caches.storage, local))?.value).toEqual({ printing: 'maybe' })
    expect([...local.values.keys()].some(key => key.startsWith('magiccon:offline-continuity:'))).toBe(false)
  })
  it('verifies readback, reports both-store failure safely, retains a failed latest payload, and retries only that payload', async () => {
    const { getOfflineLaneStatuses, retryFailedOfflineLanes } = await import('./offlineLaneCache')
    const caches = memoryCaches(), local = quotaStorage()
    caches.cache.put.mockResolvedValueOnce(undefined) // A resolved write without a stored envelope is not success.
    await expect(writeOfflineLane('retry-owner', 'walletReceipts', [{ original: 'private payload' }], local, caches.storage)).rejects.toMatchObject({ name: 'OfflineLaneCacheWriteError' })
    expect(getOfflineLaneStatuses('retry-owner')).toEqual([{ ownerId: 'retry-owner', lane: 'walletReceipts', status: 'failed', errorName: 'QuotaExceededError' }])
    expect(JSON.stringify(getOfflineLaneStatuses('retry-owner'))).not.toContain('private payload')
    await retryFailedOfflineLanes('different-owner')
    expect(caches.cache.put).toHaveBeenCalledTimes(1)
    await retryFailedOfflineLanes('retry-owner')
    expect(getOfflineLaneStatuses('retry-owner')[0].status).toBe('verified')
    expect((await readOfflineLane('retry-owner', 'walletReceipts', caches.storage, local))?.value).toEqual([{ original: 'private payload' }])
  })
  it('keeps a failure visible when reopen can only recover the previous acknowledged value', async () => {
    const { getOfflineLaneStatuses } = await import('./offlineLaneCache')
    const caches = memoryCaches(), local = quotaStorage()
    await writeOfflineLane('last-good-status', 'notes', ['last good'], local, caches.storage)
    caches.cache.put.mockRejectedValueOnce(new Error('private error details'))
    await expect(writeOfflineLane('last-good-status', 'notes', ['unsaved new'], local, caches.storage)).rejects.toThrow()
    expect((await readOfflineLane('last-good-status', 'notes', caches.storage, local))?.value).toEqual(['last good'])
    expect(getOfflineLaneStatuses('last-good-status')[0].status).toBe('failed')
  })
  it('recovers corrupted primary data from untouched legacy originals, and reports known evicted data instead of claiming readiness', async () => {
    const { getOfflineLaneStatuses } = await import('./offlineLaneCache')
    const local = memoryStorage(), caches = memoryCaches()
    writeOfflineContinuityLane('corruption-owner', 'walletReceipts', [{ original: 'legacy receipt' }], local)
    await writeOfflineLane('corruption-owner', 'walletReceipts', [{ original: 'new receipt' }], local, caches.storage)
    const address = [...caches.values.keys()][0]
    caches.values.set(address, new Response('{corrupt'))
    expect((await readOfflineLane('corruption-owner', 'walletReceipts', caches.storage, local))?.value).toEqual([{ original: 'legacy receipt' }])
    await writeOfflineLane('evicted-owner', 'companions', [], local, caches.storage)
    caches.values.clear()
    expect(await readOfflineLane('evicted-owner', 'companions', caches.storage, local)).toBeNull()
    expect(getOfflineLaneStatuses('evicted-owner')[0].status).toBe('failed')
    expect(await readOfflineLane('first-visit-owner', 'companions', caches.storage, local)).toBeNull()
    expect(getOfflineLaneStatuses('first-visit-owner')).toEqual([])
  })
  it('rejects old/unknown envelope and artist privacy versions, and validates object lanes', async () => {
    const local = memoryStorage(), caches = memoryCaches()
    await writeOfflineLane('versions-owner', 'artistCatalog', { artists: [], cards: [] }, local, caches.storage)
    const address = [...caches.values.keys()][0]
    const original = JSON.parse(await caches.values.get(address)!.clone().text())
    expect(original.artistCatalogVersion).toBe(2)
    for (const changed of [{ version: 999 }, { artistCatalogVersion: 1 }, { ownerId: 'other-owner' }, { value: { artists: [] } }]) {
      caches.values.set(address, new Response(JSON.stringify({ ...original, ...changed })))
      expect(await readOfflineLane('versions-owner', 'artistCatalog', caches.storage, local)).toBeNull()
    }
    expect(usableOfflineLane('artistSigningInterests', {})).toBe(true)
    expect(usableOfflineLane('artistSigningInterests', { p: 'unknown' })).toBe(false)
    expect(usableOfflineLane('artistCatalog', [])).toBe(false)
  })
  it('fences late cache and server reads after newer acknowledged state, including authoritative empties', async () => {
    const { offlineLaneReadGuard } = await import('./offlineLaneCache')
    const local = memoryStorage(), caches = memoryCaches()
    await writeOfflineLane('race-owner', 'artistSigningInterests', { printing: 'want_signed' }, local, caches.storage)
    let release!: () => void
    const held = new Promise<void>(resolve => { release = resolve })
    const stale = [...caches.values.values()][0].clone()
    caches.cache.match.mockImplementationOnce(async () => { await held; return stale })
    const read = readOfflineLane('race-owner', 'artistSigningInterests', caches.storage, local)
    const oldServerCanPublish = offlineLaneReadGuard('race-owner', 'artistSigningInterests')
    await writeOfflineLane('race-owner', 'artistSigningInterests', {}, local, caches.storage)
    release()
    expect(await read).toBeNull()
    expect(oldServerCanPublish()).toBe(false)
    expect((await readOfflineLane('race-owner', 'artistSigningInterests', caches.storage, local))?.value).toEqual({})
  })
  it('retains authoritative trust-slice absence over a legacy original and rejects mismatched owners', async () => {
    const local = memoryStorage(), caches = memoryCaches()
    local.setItem('magiccon:black-lotus-trust-slice:v1', JSON.stringify({ ownerId: 'trust-owner', savedAt: '2026-01-01', occurrence: { id: 'old' }, observation: { id: 'old' } }))
    expect((await readOfflineLane('trust-owner', 'trustSlice', caches.storage, local))?.value).toMatchObject({ occurrence: { id: 'old' } })
    expect(await readOfflineLane('other-trust-owner', 'trustSlice', caches.storage, local)).toBeNull()
    await writeOfflineLane('trust-owner', 'trustSlice', null, local, caches.storage)
    expect((await readOfflineLane('trust-owner', 'trustSlice', caches.storage, local))?.value).toBeNull()
    await expect(writeOfflineLane('trust-owner', 'trustSlice', { ownerId: 'other', savedAt: '2026-01-01', occurrence: { id: 'x' }, observation: { id: 'x' } }, local, caches.storage)).rejects.toThrow()
  })
})

describe('storage access denial', () => {
  it('still saves and reopens from CacheStorage when the localStorage getter itself throws', async () => {
    const caches = memoryCaches()
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('blocked', 'SecurityError') })
    expect(await writeOfflineLane('blocked-access', 'walletReceipts', [{ complete: 'receipt' }], undefined, caches.storage)).toEqual({ source: 'cache-storage' })
    expect((await readOfflineLane('blocked-access', 'walletReceipts', caches.storage))?.value).toEqual([{ complete: 'receipt' }])
  })
})

describe('reopen ordering', () => {
  it('accepts server-empty data over a newer-clock persisted fallback when the device clock moves backward', async () => {
    const local = memoryStorage(), caches = memoryCaches()
    const { OFFLINE_LANE_LOCAL_PREFIX } = await import('./offlineLaneCache')
    local.setItem(`${OFFLINE_LANE_LOCAL_PREFIX}clock-owner:companions`, JSON.stringify({ version: 1, ownerId: 'clock-owner', lane: 'companions', savedAt: '2099-01-01T00:00:00.000Z', value: ['stale local'] }))
    await writeOfflineLane('clock-owner', 'companions', [], local, caches.storage)
    const saved = await readOfflineLane('clock-owner', 'companions', caches.storage, local)
    expect(saved?.value).toEqual([])
    expect(saved!.savedAt > '2099-01-01T00:00:00.000Z').toBe(true)
  })
  it('never replaces the latest failed acknowledged payload with an eviction-read retry', async () => {
    const { retryFailedOfflineLanes } = await import('./offlineLaneCache')
    const local = memoryStorage(), caches = memoryCaches()
    await writeOfflineLane('retained-failed-payload', 'selections', ['old'], local, caches.storage)
    caches.values.clear()
    caches.cache.put.mockRejectedValueOnce(new Error('blocked'))
    await expect(writeOfflineLane('retained-failed-payload', 'selections', ['latest acknowledgment'], quotaStorage(local), caches.storage)).rejects.toThrow()
    expect(await readOfflineLane('retained-failed-payload', 'selections', caches.storage, local)).toBeNull()
    await retryFailedOfflineLanes('retained-failed-payload')
    expect((await readOfflineLane('retained-failed-payload', 'selections', caches.storage, local))?.value).toEqual(['latest acknowledgment'])
  })
})

describe('finite legacy compatibility hydration', () => {
  it('parses one unchanged large owner pack once across all lanes and invalidates on an old-client update', async () => {
    const { ALL_OFFLINE_LANES } = await import('./offlineLaneCache')
    const local = memoryStorage()
    writeOfflineContinuityLane('parse-once-owner', 'notes', [{ full: 'original'.repeat(300000) }], local)
    writeOfflineContinuityLane('parse-once-owner', 'walletReceipts', [{ receipt_artifacts: [{ object_path: 'private-original.pdf' }] }], local)
    const raw = local.getItem('magiccon:offline-continuity:v1:parse-once-owner')!
    const parse = vi.spyOn(JSON, 'parse')
    const results = await Promise.all(ALL_OFFLINE_LANES.map(lane => readOfflineLane('parse-once-owner', lane, undefined, local)))
    expect(parse.mock.calls.filter(([body]) => body === raw)).toHaveLength(1)
    expect(results[ALL_OFFLINE_LANES.indexOf('walletReceipts')]?.value).toEqual([{ receipt_artifacts: [{ object_path: 'private-original.pdf' }] }])
    expect(Object.isFrozen(results[ALL_OFFLINE_LANES.indexOf('notes')]?.value)).toBe(true)
    expect(local.getItem('magiccon:offline-continuity:v1:parse-once-owner')).toBe(raw)
    writeOfflineContinuityLane('parse-once-owner', 'notes', ['changed by old client'], local)
    expect((await readOfflineLane('parse-once-owner', 'notes', undefined, local))?.value).toEqual(['changed by old client'])
    expect(await readOfflineLane('another-parse-owner', 'walletReceipts', undefined, local)).toBeNull()
  })
})
