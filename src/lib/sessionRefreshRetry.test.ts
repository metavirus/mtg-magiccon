import { describe, expect, it, vi } from 'vitest'
import { retryOnceAfterUnauthorized } from './sessionRefreshRetry'

describe('retryOnceAfterUnauthorized', () => {
  it('refreshes the session and retries one time after a 401', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce({ error: new Error('expired'), status: 401 })
      .mockResolvedValueOnce({ error: null, status: 200 })
    const refreshSession = vi.fn().mockResolvedValue({ error: null })

    const result = await retryOnceAfterUnauthorized(request, refreshSession)

    expect(result.status).toBe(200)
    expect(request).toHaveBeenCalledTimes(2)
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('does not refresh for non-auth failures', async () => {
    const request = vi.fn().mockResolvedValue({ error: new Error('offline'), status: 503 })
    const refreshSession = vi.fn().mockResolvedValue({ error: null })

    const result = await retryOnceAfterUnauthorized(request, refreshSession)

    expect(result.status).toBe(503)
    expect(request).toHaveBeenCalledTimes(1)
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('does not repeat the request when session refresh fails', async () => {
    const request = vi.fn().mockResolvedValue({ error: new Error('expired'), status: 401 })
    const refreshSession = vi.fn().mockResolvedValue({ error: new Error('refresh failed') })

    const result = await retryOnceAfterUnauthorized(request, refreshSession)

    expect(result.status).toBe(401)
    expect(request).toHaveBeenCalledTimes(1)
    expect(refreshSession).toHaveBeenCalledTimes(1)
  })
})
