import { writeOfflineLane } from './offlineLaneCache'

/** Explicit preview-only fault rehearsal. Uses disposable memory stores, never
 * the account's real device snapshots or server. Retry uses the same boundary. */
export function rehearseOfflineSaveFailure(ownerId: string) {
  const values = new Map<string, string>()
  let fail = true
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (fail) { fail = false; throw new DOMException('QA storage fault', 'QuotaExceededError') }
      values.set(key, value)
    },
  }
  const unavailableCache = { open: async () => { throw new DOMException('QA storage fault', 'QuotaExceededError') } } as unknown as CacheStorage
  return writeOfflineLane(ownerId, 'notes', [], storage, unavailableCache).catch(() => {})
}
