export const OFFLINE_CONTINUITY_CACHE_PREFIX = 'magiccon:offline-continuity:v1:'

export type ContinuityLane =
  | 'notes' | 'mentions' | 'selections' | 'activity'
  | 'findings' | 'concepts' | 'info' | 'flights'

export type OfflineContinuitySnapshot = {
  version: 1
  ownerId: string
  savedAt: string
  lanes: Partial<Record<ContinuityLane, unknown>>
}

function cacheKey(ownerId: string) {
  return `${OFFLINE_CONTINUITY_CACHE_PREFIX}${ownerId}`
}

export function readOfflineContinuity(
  ownerId: string,
  storage: Pick<Storage, 'getItem'> = localStorage,
): OfflineContinuitySnapshot | null {
  try {
    const raw = storage.getItem(cacheKey(ownerId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as OfflineContinuitySnapshot
    if (parsed.version !== 1 || parsed.ownerId !== ownerId || !parsed.savedAt || !parsed.lanes || typeof parsed.lanes !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

export function writeOfflineContinuityLane(
  ownerId: string,
  lane: ContinuityLane,
  value: unknown,
  storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage,
  savedAt = new Date().toISOString(),
) {
  const current = readOfflineContinuity(ownerId, storage)
  const snapshot: OfflineContinuitySnapshot = {
    version: 1,
    ownerId,
    savedAt,
    lanes: { ...(current?.lanes ?? {}), [lane]: value },
  }
  storage.setItem(cacheKey(ownerId), JSON.stringify(snapshot))
}

/** Tracks connectivity edges. Repeated browser `online` events do not start a
 * second refresh while the first is running or until another offline edge. */
export function createReconnectRefresh(run: () => Promise<void>) {
  let wasOffline = false
  let inFlight: Promise<void> | null = null
  return (online: boolean) => {
    if (!online) {
      wasOffline = true
      return Promise.resolve()
    }
    if (!wasOffline) return inFlight ?? Promise.resolve()
    wasOffline = false
    if (!inFlight) inFlight = run().finally(() => { inFlight = null })
    return inFlight
  }
}
