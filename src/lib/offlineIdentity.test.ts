import { describe, expect, it, vi } from 'vitest'
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

  it('does not report saved offline access after quota failure or an unretained write', () => {
    expect(() => writeOfflineIdentity({ userId: 'new-owner' }, {
      getItem: () => null,
      setItem: () => { throw new DOMException('full', 'QuotaExceededError') },
    })).toThrow()
    expect(() => writeOfflineIdentity({ userId: 'new-owner' }, {
      getItem: () => JSON.stringify({ userId: 'old-owner' }), setItem: () => {},
    })).toThrow('Offline identity readback failed')
  })

  it('keeps startup usable when access to the storage object itself is denied', () => {
    const denied = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => { throw new DOMException('denied', 'SecurityError') })
    try {
      expect(readOfflineIdentity()).toBeNull()
      expect(() => writeOfflineIdentity({ userId: 'owner' })).toThrow()
    } finally { denied.mockRestore() }
  })
})
