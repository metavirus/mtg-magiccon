export const OFFLINE_IDENTITY_KEY = 'magiccon:offline-identity:v1'

export type OfflineIdentity = {
  userId: string
  email?: string
  displayName?: string
}

export function readOfflineIdentity(storage: Pick<Storage, 'getItem'> = localStorage): OfflineIdentity | null {
  try {
    const parsed = JSON.parse(storage.getItem(OFFLINE_IDENTITY_KEY) ?? 'null') as OfflineIdentity | null
    if (!parsed?.userId || typeof parsed.userId !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

export function writeOfflineIdentity(identity: OfflineIdentity, storage: Pick<Storage, 'setItem'> = localStorage) {
  storage.setItem(OFFLINE_IDENTITY_KEY, JSON.stringify(identity))
}

export function clearOfflineIdentity(storage: Pick<Storage, 'removeItem'> = localStorage) {
  storage.removeItem(OFFLINE_IDENTITY_KEY)
}
