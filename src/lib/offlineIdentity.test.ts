import { describe, expect, it } from 'vitest'
import { clearOfflineIdentity, OFFLINE_IDENTITY_KEY, readOfflineIdentity, writeOfflineIdentity } from './offlineIdentity'

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
    has: (key: string) => values.has(key),
  }
}

describe('offline identity', () => {
  it('retains only the identity needed to select the owner-scoped offline cache', () => {
    const storage = memoryStorage()
    writeOfflineIdentity({ userId: 'owner-1', email: 'kavi@example.com', displayName: 'Kavi' }, storage)
    expect(readOfflineIdentity(storage)).toEqual({ userId: 'owner-1', email: 'kavi@example.com', displayName: 'Kavi' })
    expect(storage.getItem(OFFLINE_IDENTITY_KEY)).not.toContain('token')
  })

  it('clears the device identity on explicit sign-out', () => {
    const storage = memoryStorage()
    writeOfflineIdentity({ userId: 'owner-1' }, storage)
    clearOfflineIdentity(storage)
    expect(storage.has(OFFLINE_IDENTITY_KEY)).toBe(false)
    expect(readOfflineIdentity(storage)).toBeNull()
  })
})
