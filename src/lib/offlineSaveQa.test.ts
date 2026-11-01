import { expect, it, vi } from 'vitest'
import { rehearseOfflineSaveFailure } from './offlineSaveQa'
import { getOfflineLaneStatuses, retryFailedOfflineLanes } from './offlineLaneCache'

it('rehearses a recoverable device failure without changing real storage or calling a server', async () => {
  const fetch = vi.spyOn(globalThis, 'fetch')
  const set = vi.spyOn(Storage.prototype, 'setItem')
  try {
    await rehearseOfflineSaveFailure('qa-isolated-owner')
    expect(getOfflineLaneStatuses('qa-isolated-owner')).toContainEqual(expect.objectContaining({ lane: 'notes', status: 'failed' }))
    await retryFailedOfflineLanes('qa-isolated-owner')
    expect(getOfflineLaneStatuses('qa-isolated-owner')).toContainEqual(expect.objectContaining({ lane: 'notes', status: 'verified' }))
    expect(set).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  } finally { set.mockRestore(); fetch.mockRestore() }
})
