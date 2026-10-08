import { describe, expect, it, vi } from 'vitest'
import { fetchPublicSourceText } from './public_source_fetch.mjs'

describe('bounded public source transport', () => {
  it('recovers transient HTTP with capped Retry-After and preserves exact final status', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('busy', { status: 429, headers: { 'retry-after': '600' } })).mockResolvedValueOnce(new Response('exact bytes'))
    const sleep = vi.fn()
    await expect(fetchPublicSourceText('https://example.test', { fetchImpl, sleep })).resolves.toEqual({ status: 200, ok: true, html: 'exact bytes' })
    expect(sleep).toHaveBeenCalledWith(3000)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
  it('returns permanent HTTP without retry and exhausted transient HTTP exactly', async () => {
    for (const status of [403, 503]) {
      const fetchImpl = vi.fn(async () => new Response('source failure', { status }))
      await expect(fetchPublicSourceText('https://example.test', { fetchImpl, sleep: vi.fn() })).resolves.toEqual({ status, ok: false, html: 'source failure' })
      expect(fetchImpl).toHaveBeenCalledTimes(status === 403 ? 1 : 3)
    }
  })
  it('recovers network failure but retains exhausted cause', async () => {
    const failure = new TypeError('fetch failed', { cause: Object.assign(new Error('socket reset'), { code: 'ECONNRESET' }) })
    const fetchImpl = vi.fn().mockRejectedValueOnce(failure).mockResolvedValueOnce(new Response('recovered'))
    await expect(fetchPublicSourceText('https://example.test', { fetchImpl, sleep: vi.fn() })).resolves.toMatchObject({ html: 'recovered' })
    await expect(fetchPublicSourceText('https://example.test', { fetchImpl: vi.fn().mockRejectedValue(failure), sleep: vi.fn() })).rejects.toThrow('fetch failed; cause: socket reset')
  })
  it('bounds uncooperative requests and slow response bodies by the same deadline', async () => {
    for (const fetchImpl of [vi.fn(() => new Promise(() => {})), vi.fn(async () => new Response(new ReadableStream({ start() {} })))]) {
      await expect(fetchPublicSourceText('https://example.test', { fetchImpl, timeoutMs: 5, sleep: vi.fn() })).rejects.toThrow('timed out after 5ms')
      expect(fetchImpl).toHaveBeenCalledTimes(3)
    }
  })
  it('rejects declared and streaming byte overflow without retry', async () => {
    for (const response of [new Response('12345'), new Response('small', { headers: { 'content-length': '1000' } })]) {
      const fetchImpl = vi.fn(async () => response)
      await expect(fetchPublicSourceText('https://example.test', { fetchImpl, maxBytes: 4 })).rejects.toThrow('byte limit')
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    }
  })
  it('uses verified TLS fallback only for certificate failures and retains both errors', async () => {
    const failure = new TypeError('fetch failed', { cause: Object.assign(new Error('unable to verify the first certificate'), { code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }) })
    const fetchImpl = vi.fn().mockRejectedValue(failure)
    const tlsFallback = vi.fn(async () => ({ status: 200, ok: true, html: 'windows bytes' }))
    await expect(fetchPublicSourceText('https://example.test', { fetchImpl, tlsFallback })).resolves.toMatchObject({ html: 'windows bytes' })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await expect(fetchPublicSourceText('https://example.test', { fetchImpl, tlsFallback: async () => { throw new Error('Windows TLS rejected') } })).rejects.toThrow('cause: unable to verify the first certificate; powershell fallback: Windows TLS rejected')
  })
  it('does not interpret or retry malformed payloads or deterministic errors', async () => {
    const fetchImpl = vi.fn(async () => new Response('not JSON'))
    const result = await fetchPublicSourceText('https://example.test', { fetchImpl })
    expect(() => JSON.parse(result.html)).toThrow()
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    const invalid = vi.fn().mockRejectedValue(new Error('identity mismatch'))
    await expect(fetchPublicSourceText('https://example.test', { fetchImpl: invalid })).rejects.toThrow('identity mismatch')
    expect(invalid).toHaveBeenCalledTimes(1)
  })
})
