import { readTrustSliceCache } from './trustSlice'
import { OFFLINE_CONTINUITY_CACHE_PREFIX, readOfflineContinuity, type OfflineContinuitySnapshot, type ContinuityLane } from './offlineContinuity'

export const OFFLINE_LANE_CACHE = 'magiccon-continuity-lanes-v1'
export const OFFLINE_LANE_LOCAL_PREFIX = 'magiccon:offline-lane:v1:'
export const OFFLINE_LANE_STATUS_EVENT = 'magiccon-offline-lane-status'
export const ALL_OFFLINE_LANES: ContinuityLane[] = ['notes', 'mentions', 'selections', 'activity', 'findings', 'concepts', 'info', 'flights', 'ticketedAvailability', 'catalog', 'exhibitors', 'walletReceipts', 'companions', 'artistCatalog', 'artistSigningInterests', 'monitorAlerts', 'trustSlice']
export const STARTUP_CACHE_LANES: ContinuityLane[] = ALL_OFFLINE_LANES.filter(lane => !['walletReceipts', 'companions', 'artistCatalog', 'artistSigningInterests'].includes(lane))
export type OfflineLaneSnapshot = { version: 1; ownerId: string; lane: ContinuityLane; savedAt: string; value: unknown; artistCatalogVersion?: 2; source?: 'local-storage' | 'cache-storage' }
export type OfflineLaneStatus = { ownerId: string; lane: ContinuityLane; status: 'saving' | 'verified' | 'failed'; errorName?: string }
// Access inside operations so a browser-denied localStorage getter cannot
// prevent the independent CacheStorage primary from being attempted.
const deviceStorage = {
  getItem: (key: string) => globalThis.localStorage.getItem(key),
  setItem: (key: string, value: string) => globalThis.localStorage.setItem(key, value),
}
// Compatibility parsing is shared across the finite hydration batch. Compare
// the raw string on each read so an older client/new tab update invalidates it.
const legacyReads = new WeakMap<object, Map<string, { raw: string | null; snapshot: OfflineContinuitySnapshot | null }>>()
function readLegacy(ownerId: string, storage: Pick<Storage, 'getItem'>): OfflineContinuitySnapshot | null {
  try {
    const raw = storage.getItem(`${OFFLINE_CONTINUITY_CACHE_PREFIX}${ownerId}`)
    let owners = legacyReads.get(storage)
    const cached = owners?.get(ownerId)
    if (cached && cached.raw === raw) return cached.snapshot
    const snapshot = readOfflineContinuity(ownerId, { getItem: () => raw })
    // Boundary consumers receive read-only acknowledged snapshots. Freeze once,
    // rather than clone/parse the full historical owner pack for each lane.
    const freeze = (value: unknown): void => {
      if (!value || typeof value !== 'object' || Object.isFrozen(value)) return
      Object.freeze(value)
      for (const child of Object.values(value)) freeze(child)
    }
    freeze(snapshot)
    if (!owners) { owners = new Map(); legacyReads.set(storage, owners) }
    owners.set(ownerId, { raw, snapshot })
    return snapshot
  } catch { return null }
}
function availableCacheStorage() {
  try { return globalThis.caches } catch { return undefined }
}
const saves = new Map<string, Promise<unknown>>()
const revisions = new Map<string, number>()
const statuses = new Map<string, OfflineLaneStatus>()
const failed = new Map<string, () => Promise<unknown>>()
const failedWrites = new Set<string>()
const savedTimes = new Map<string, number>()
const laneId = (ownerId: string, lane: ContinuityLane) => `${ownerId}:${lane}`
const localKey = (ownerId: string, lane: ContinuityLane) => `${OFFLINE_LANE_LOCAL_PREFIX}${encodeURIComponent(ownerId)}:${lane}`
function key(ownerId: string, lane: ContinuityLane) {
  return new URL(`./__offline_continuity/${encodeURIComponent(ownerId)}/${lane}`, window.location.href).toString()
}
export function safeCacheErrorName(error: unknown) {
  const name = error instanceof Error || error instanceof DOMException ? error.name : 'Error'
  return ['Error', 'QuotaExceededError', 'SecurityError', 'InvalidStateError', 'UnknownError', 'TypeError', 'RangeError', 'NS_ERROR_DOM_QUOTA_REACHED'].includes(name) ? name : 'Error'
}
export class OfflineLaneCacheWriteError extends Error {
  constructor(readonly localErrorName: string, readonly fallbackErrorName: string) {
    super('Device snapshot could not be saved')
    this.name = 'OfflineLaneCacheWriteError'
  }
}
export function usableOfflineLane(lane: ContinuityLane, value: unknown): boolean {
  if (lane === 'trustSlice') {
    if (value === null) return true
    const slice = value as { ownerId?: string; occurrence?: { id?: string }; observation?: { id?: string }; savedAt?: string } | null
    return Boolean(slice?.ownerId && slice.occurrence?.id && slice.observation?.id && slice.savedAt)
  }
  if (lane === 'catalog') {
    const model = value as { status?: string; offers?: Array<{ event_key?: string; attributes?: Record<string, unknown> | null }> } | null
    return model?.status === 'ready' && Array.isArray(model.offers) && model.offers.every(offer => offer?.event_key === 'magiccon_atlanta_2026' && !offer.attributes?.local_review)
  }
  if (lane === 'info') {
    const info = value as { topics?: unknown[]; feed?: unknown[] } | null
    return Boolean(info && Array.isArray(info.topics) && Array.isArray(info.feed))
  }
  if (lane === 'artistCatalog') {
    const catalog = value as { artists?: unknown[]; cards?: unknown[] } | null
    return Boolean(catalog && Array.isArray(catalog.artists) && Array.isArray(catalog.cards))
  }
  if (lane === 'artistSigningInterests') return Boolean(value && typeof value === 'object' && !Array.isArray(value) && Object.values(value).every(status => ['maybe', 'want_signed'].includes(String(status))))
  return Array.isArray(value)
}
function valid(saved: OfflineLaneSnapshot | null, ownerId: string, lane: ContinuityLane): saved is OfflineLaneSnapshot {
  return Boolean(saved && saved.version === 1 && saved.ownerId === ownerId && saved.lane === lane && (lane !== 'trustSlice' || saved.value === null || (saved.value as { ownerId?: string }).ownerId === ownerId) && Number.isFinite(Date.parse(saved.savedAt)) && (lane !== 'artistCatalog' || saved.artistCatalogVersion === 2) && usableOfflineLane(lane, saved.value))
}
/** Small compatibility read only: never rewrites or removes the legacy originals. */
export function readOfflineLaneSync(ownerId: string, lane: ContinuityLane, storage: Pick<Storage, 'getItem'> = deviceStorage, legacy = readLegacy(ownerId, storage)): OfflineLaneSnapshot | null {
  let saved: OfflineLaneSnapshot | null = null
  try {
    const candidate = JSON.parse(storage.getItem(localKey(ownerId, lane)) ?? 'null') as OfflineLaneSnapshot | null
    if (valid(candidate, ownerId, lane)) saved = { ...candidate, source: 'local-storage' }
  } catch { /* Another store or the original may still be readable. */ }
  const legacyTime = legacy?.laneSavedAt?.[lane] ?? (legacy ? '1970-01-01T00:00:00.000Z' : undefined)
  if (legacy && legacyTime && usableOfflineLane(lane, legacy.lanes[lane])) {
    const original: OfflineLaneSnapshot = { version: 1, ownerId, lane, value: legacy.lanes[lane], savedAt: legacyTime, artistCatalogVersion: legacy.artistCatalogVersion, source: 'local-storage' }
    if (valid(original, ownerId, lane) && (!saved || original.savedAt > saved.savedAt)) saved = original
  }
  if (lane === 'trustSlice' && !saved) {
    const original = readTrustSliceCache(storage)
    if (original?.ownerId === ownerId) saved = { version: 1, ownerId, lane, savedAt: original.savedAt, value: original, source: 'local-storage' }
  }
  if (saved) savedTimes.set(laneId(ownerId, lane), Math.max(savedTimes.get(laneId(ownerId, lane)) ?? 0, Date.parse(saved.savedAt)))
  return saved
}
/** Synchronous compatibility paint; complete CacheStorage hydration follows. */
export function readOfflineLanesSync(ownerId: string): OfflineContinuitySnapshot | null {
  const legacy = readLegacy(ownerId, deviceStorage)
  const lanes: OfflineContinuitySnapshot['lanes'] = {}, laneSavedAt: NonNullable<OfflineContinuitySnapshot['laneSavedAt']> = {}
  for (const lane of ALL_OFFLINE_LANES) {
    const saved = readOfflineLaneSync(ownerId, lane, deviceStorage, legacy)
    if (saved) { lanes[lane] = saved.value; laneSavedAt[lane] = saved.savedAt }
  }
  return Object.keys(lanes).length ? { version: 1, ownerId, savedAt: new Date().toISOString(), lanes, laneSavedAt, artistCatalogVersion: 2 } : null
}
function report(detail: OfflineLaneStatus) {
  statuses.set(laneId(detail.ownerId, detail.lane), detail)
  window.dispatchEvent(new CustomEvent(OFFLINE_LANE_STATUS_EVENT, { detail }))
}
export const getOfflineLaneStatuses = (ownerId: string) => [...statuses.values()].filter(status => status.ownerId === ownerId)
export async function retryFailedOfflineLanes(ownerId: string) {
  await Promise.allSettled([...failed].filter(([id]) => statuses.get(id)?.ownerId === ownerId).map(([, retry]) => retry()))
}
/** A slow network read started before another acknowledgment cannot replay it. */
export function offlineLaneReadGuard(ownerId: string, lane: ContinuityLane) {
  const id = laneId(ownerId, lane), revision = revisions.get(id)
  return () => revisions.get(id) === revision
}
/** Complete per-lane snapshots. CacheStorage is primary; local fallback is also
 * per lane, so a Wallet update never serializes the catalog or other originals.
 * Success requires exact readback. Neither store is a server mutation queue. */
export function writeOfflineLane(
  ownerId: string, lane: ContinuityLane, value: unknown,
  storage: Pick<Storage, 'getItem' | 'setItem'> = deviceStorage,
  cacheStorage: CacheStorage | undefined = availableCacheStorage(),
): Promise<{ source: 'local-storage' | 'cache-storage'; localErrorName?: string }> {
  const address = key(ownerId, lane), id = laneId(ownerId, lane)
  const revision = (revisions.get(id) ?? 0) + 1
  revisions.set(id, revision)
  const time = Math.max(Date.now(), (savedTimes.get(id) ?? 0) + 1)
  savedTimes.set(id, time)
  const snapshot: OfflineLaneSnapshot = { version: 1, ownerId, lane, savedAt: new Date(time).toISOString(), value, ...(lane === 'artistCatalog' ? { artistCatalogVersion: 2 as const } : {}) }
  // Capture before async work; callers may mutate their own objects afterward.
  let body: string
  try {
    if (!valid(snapshot, ownerId, lane)) throw new TypeError('Invalid device snapshot')
    body = JSON.stringify(snapshot)
  } catch (error) {
    report({ ownerId, lane, status: 'failed', errorName: safeCacheErrorName(error) })
    return Promise.reject(error)
  }
  failed.delete(id)
  failedWrites.delete(id)
  report({ ownerId, lane, status: 'saving' })
  const previous = saves.get(id)
  const advanceTimestamp = (candidate: OfflineLaneSnapshot | null) => {
    if (!valid(candidate, ownerId, lane)) return
    const time = Math.max(Date.parse(snapshot.savedAt), Date.parse(candidate.savedAt) + 1)
    savedTimes.set(id, Math.max(savedTimes.get(id) ?? 0, time))
    if (time !== Date.parse(snapshot.savedAt)) {
      snapshot.savedAt = new Date(time).toISOString()
      body = JSON.stringify({ ...JSON.parse(body), savedAt: snapshot.savedAt })
    }
  }
  const save = async () => {
    try { advanceTimestamp(JSON.parse(storage.getItem(localKey(ownerId, lane)) ?? 'null')) } catch { /* Cache primary remains independent. */ }
    let result: { source: 'local-storage' | 'cache-storage'; localErrorName?: string }
    try {
      if (!cacheStorage) throw new Error('Cache storage unavailable')
      const cache = await cacheStorage.open(OFFLINE_LANE_CACHE)
      try {
        const previous = await cache.match(address)
        if (previous) advanceTimestamp(await previous.json() as OfflineLaneSnapshot)
      } catch { /* An invalid old envelope must not block a fresh acknowledgment. */ }
      await cache.put(address, new Response(body, { headers: { 'Content-Type': 'application/json' } }))
      if (await (await cache.match(address))?.text() !== body) throw new Error('Snapshot readback failed')
      result = { source: 'cache-storage' }
    } catch (cacheError) {
      try {
        storage.setItem(localKey(ownerId, lane), body)
        if (storage.getItem(localKey(ownerId, lane)) !== body) throw new Error('Snapshot readback failed')
        result = { source: 'local-storage' }
      } catch (localError) {
        if (revisions.get(id) === revision) {
          failedWrites.add(id)
          failed.set(id, () => writeOfflineLane(ownerId, lane, JSON.parse(body).value, storage, cacheStorage))
          report({ ownerId, lane, status: 'failed', errorName: safeCacheErrorName(localError) })
        }
        throw new OfflineLaneCacheWriteError(safeCacheErrorName(localError), safeCacheErrorName(cacheError))
      }
    }
    if (revisions.get(id) === revision) {
      try { storage.setItem(`${localKey(ownerId, lane)}:receipt`, JSON.stringify({ version: 1, ownerId, lane, savedAt: snapshot.savedAt })) } catch { /* Payload readback is authoritative; a quota-full receipt is optional. */ }
      report({ ownerId, lane, status: 'verified' })
    }
    return result
  }
  const pending = previous ? previous.catch(() => {}).then(save) : save()
  saves.set(id, pending)
  void pending.then(() => { if (saves.get(id) === pending) saves.delete(id) }, () => { if (saves.get(id) === pending) saves.delete(id) })
  return pending
}
/** Safe feature fire-and-observe; failure remains in the central status receipt. */
export function saveOfflineLane(ownerId: string, lane: ContinuityLane, value: unknown) {
  void writeOfflineLane(ownerId, lane, value).catch(() => { console.warn('Device snapshot could not be saved', lane) })
}
export async function readOfflineLane(
  ownerId: string, lane: ContinuityLane,
  cacheStorage: CacheStorage | undefined = availableCacheStorage(),
  storage: Pick<Storage, 'getItem'> = deviceStorage,
): Promise<OfflineLaneSnapshot | null> {
  const isCurrent = offlineLaneReadGuard(ownerId, lane)
  let saved = readOfflineLaneSync(ownerId, lane, storage)
  let expected = false
  let expectedAt: string | undefined
  try {
    const receipt = JSON.parse(storage.getItem(`${localKey(ownerId, lane)}:receipt`) ?? 'null')
    expected = receipt?.version === 1 && receipt.ownerId === ownerId && receipt.lane === lane
    if (expected && Number.isFinite(Date.parse(receipt.savedAt))) expectedAt = receipt.savedAt
    expected ||= Boolean(storage.getItem(localKey(ownerId, lane)))
  } catch { /* Read-only access may be unavailable. */ }
  try {
    if (cacheStorage) {
      const response = await (await cacheStorage.open(OFFLINE_LANE_CACHE)).match(key(ownerId, lane))
      expected ||= Boolean(response)
      const candidate = response ? await response.json() as OfflineLaneSnapshot : null
      if (valid(candidate, ownerId, lane) && (!saved || candidate.savedAt >= saved.savedAt)) saved = { ...candidate, source: 'cache-storage' }
    }
  } catch { /* Corrupt/evicted primary can recover from an intact local original. */ }
  if (!isCurrent()) return null
  if ((!saved && expected) || (saved && expectedAt && saved.savedAt < expectedAt)) {
    const id = laneId(ownerId, lane)
    if (failedWrites.has(id)) return saved
    failed.set(id, async () => {
      const fresh = offlineLaneReadGuard(ownerId, lane)
      report({ ownerId, lane, status: 'saving' })
      const recovered = await readOfflineLane(ownerId, lane, cacheStorage, storage)
      if (!fresh()) return recovered
      if (recovered && (!expectedAt || recovered.savedAt >= expectedAt)) { failed.delete(id); report({ ownerId, lane, status: 'verified' }) }
      return recovered
    })
    report({ ownerId, lane, status: 'failed', errorName: 'Error' })
  }
  return saved
}
