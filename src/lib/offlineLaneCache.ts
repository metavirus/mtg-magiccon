import { writeOfflineContinuityLane, type ContinuityLane } from './offlineContinuity'

export const OFFLINE_LANE_CACHE = 'magiccon-continuity-lanes-v1'
export const STARTUP_CACHE_LANES: ContinuityLane[] = ['notes', 'mentions', 'selections', 'activity', 'findings', 'concepts', 'info', 'flights', 'ticketedAvailability', 'catalog', 'exhibitors']
export type OfflineLaneSnapshot = { version: 1; ownerId: string; lane: ContinuityLane; savedAt: string; value: unknown }
const saves = new Map<string, Promise<unknown>>()
const savedTimes = new Map<string, number>()

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
  if (lane === 'catalog') {
    const model = value as { status?: string; offers?: Array<{ event_key?: string; attributes?: Record<string, unknown> | null }> } | null
    return model?.status === 'ready' && Array.isArray(model.offers) && model.offers.every(offer => offer.event_key === 'magiccon_atlanta_2026' && !offer.attributes?.local_review)
  }
  if (lane === 'info') {
    const info = value as { topics?: unknown[]; feed?: unknown[] } | null
    return Boolean(info && Array.isArray(info.topics) && Array.isArray(info.feed))
  }
  return Array.isArray(value)
}

/** Device-only acknowledged snapshots; this never queues/replays a server write.
 * Serializing puts per owner/lane prevents a slow older save replacing a new one. */
export function writeOfflineLane(
  ownerId: string, lane: ContinuityLane, value: unknown,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  cacheStorage: CacheStorage | undefined = globalThis.caches,
): Promise<{ source: 'local-storage' | 'cache-storage'; localErrorName?: string }> {
  const address = key(ownerId, lane)
  const time = Math.max(Date.now(), (savedTimes.get(address) ?? 0) + 1)
  savedTimes.set(address, time)
  const savedAt = new Date(time).toISOString()
  // Capture the complete acknowledged value before any asynchronous work.
  const body = JSON.stringify({ version: 1, ownerId, lane, savedAt, value } satisfies OfflineLaneSnapshot)
  const previous = saves.get(address)
  const save = async () => {
    try {
      writeOfflineContinuityLane(ownerId, lane, JSON.parse(body).value, storage, savedAt)
      return { source: 'local-storage' as const }
    } catch (localError) {
      try {
        if (!cacheStorage) throw new Error('Cache storage unavailable')
        const cache = await cacheStorage.open(OFFLINE_LANE_CACHE)
        await cache.put(address, new Response(body, { headers: { 'Content-Type': 'application/json' } }))
        return { source: 'cache-storage' as const, localErrorName: safeCacheErrorName(localError) }
      } catch (fallbackError) {
        throw new OfflineLaneCacheWriteError(safeCacheErrorName(localError), safeCacheErrorName(fallbackError))
      }
    }
  }
  const pending = previous ? previous.catch(() => {}).then(save) : save()
  saves.set(address, pending)
  void pending.then(() => { if (saves.get(address) === pending) saves.delete(address) }, () => { if (saves.get(address) === pending) saves.delete(address) })
  return pending
}

export async function readOfflineLane(
  ownerId: string, lane: ContinuityLane,
  cacheStorage: CacheStorage | undefined = globalThis.caches,
): Promise<OfflineLaneSnapshot | null> {
  try {
    if (!cacheStorage) return null
    const cache = await cacheStorage.open(OFFLINE_LANE_CACHE)
    const response = await cache.match(key(ownerId, lane))
    if (!response) return null
    const saved = await response.json() as OfflineLaneSnapshot
    if (saved.version !== 1 || saved.ownerId !== ownerId || saved.lane !== lane || !Number.isFinite(Date.parse(saved.savedAt)) || !usableOfflineLane(lane, saved.value)) return null
    return saved
  } catch { return null }
}
