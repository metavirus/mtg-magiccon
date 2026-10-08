import { describe, expect, it, vi } from 'vitest'
import { fetchRetryableRequest, requestMayRetry } from './retryable_request.mjs'
import { fetchNewsletterPages } from './first_party_newsletter_intake.mjs'

describe('idempotent request resilience', () => {
  it('recovers reads and exact upserts while preserving request body and headers', async () => {
    const init = { method: 'POST', body: '{"id":"same","value":1}', headers: { prefer: 'return=representation,resolution=merge-duplicates' } }
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('busy', { status: 503 })).mockResolvedValueOnce(new Response('ok'))
    expect(await (await fetchRetryableRequest('https://example.test/rest/v1/table?on_conflict=id', init, { fetchImpl, sleep: vi.fn() })).text()).toBe('ok')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls.map(call => call[1].body)).toEqual([init.body, init.body])
    const read = vi.fn().mockRejectedValueOnce(new TypeError('fetch failed')).mockResolvedValueOnce(new Response('read'))
    expect((await fetchRetryableRequest('https://example.test/rest/v1/table', {}, { fetchImpl: read, sleep: vi.fn() })).status).toBe(200)
    expect(read).toHaveBeenCalledTimes(2)
  })
  it('never retries ambiguous POST, insert, streamed PATCH, or RPC', async () => {
    for (const [url, init] of [
      ['https://example.test/rest/v1/table', { method: 'POST', body: '{}' }],
      ['https://example.test/rest/v1/table?on_conflict=id', { method: 'POST', headers: { prefer: 'resolution=ignore-duplicates' } }],
      ['https://example.test/rest/v1/rpc/operation', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates' } }],
      ['https://example.test/rest/v1/table', { method: 'PATCH', body: new ReadableStream() }],
    ] as const) {
      expect(requestMayRetry(url, init)).toBe(false)
      const fetchImpl = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
      await expect(fetchRetryableRequest(url, init, { fetchImpl, sleep: vi.fn() })).rejects.toThrow('fetch failed')
      expect(fetchImpl).toHaveBeenCalledTimes(1)
    }
  })
  it('returns normal permanent 4xx unchanged and bounds exhausted retries', async () => {
    for (const status of [400, 403, 408, 429, 503]) {
      const fetchImpl = vi.fn(async () => new Response('exact failure', { status }))
      const result = await fetchRetryableRequest('https://example.test/', {}, { fetchImpl, sleep: vi.fn() })
      expect(result.status).toBe(status)
      expect(await result.text()).toBe('exact failure')
      expect(fetchImpl).toHaveBeenCalledTimes(status >= 408 ? 3 : 1)
    }
  })
  it('uses one overall deadline across Retry-After waits and stalled requests', async () => {
    const fetchImpl = vi.fn(async () => new Response('wait', { status: 429, headers: { 'retry-after': '600' } }))
    await expect(fetchRetryableRequest('https://example.test/', {}, { fetchImpl, timeoutMs: 10, sleep: () => new Promise(() => {}) })).rejects.toThrow('timed out after 10ms')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    await expect(fetchRetryableRequest('https://example.test/', {}, { fetchImpl: () => new Promise(() => {}), timeoutMs: 10 })).rejects.toThrow('timed out after 10ms')
  })
  it('preserves parent cancellation after headers for the article body', async () => {
    const parent = new AbortController()
    let requestSignal: AbortSignal | undefined
    await fetchRetryableRequest('https://example.test/', { signal: parent.signal }, { fetchImpl: async (_url: string, init: RequestInit) => { requestSignal = init.signal!; return new Response('body') } })
    parent.abort()
    expect(requestSignal?.aborted).toBe(true)
  })
  it('keeps the overall timeout active for a returned response body', async () => {
    let requestSignal: AbortSignal | undefined
    await fetchRetryableRequest('https://example.test/', {}, { timeoutMs: 5, fetchImpl: async (_url: string, init: RequestInit) => { requestSignal = init.signal!; return new Response('body') } })
    await new Promise(resolve => setTimeout(resolve, 15))
    expect(requestSignal?.aborted).toBe(true)
  })
  it('preserves explicit JWT-future retry but does not retry other 401s', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('JWT issued at future', { status: 401 })).mockResolvedValueOnce(new Response('ok'))
    const sleep = vi.fn()
    await fetchRetryableRequest('https://example.test/rest/v1/table', { method: 'POST', body: '{}' }, { fetchImpl, retryJwtFuture: true, sleep })
    expect(sleep).toHaveBeenCalledWith(2000)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    const denied = vi.fn(async () => new Response('denied', { status: 401 }))
    expect((await fetchRetryableRequest('https://example.test/', {}, { fetchImpl: denied, retryJwtFuture: true })).status).toBe(401)
    expect(denied).toHaveBeenCalledTimes(1)
  })
  it('failed newsletter articles retain prior hashes and fetch timestamps', async () => {
    const url = 'https://www.mtgfestivals.com/global/en-us/magiccon-news/atlanta.html'
    const fetchImpl = vi.fn(async () => new Response('busy', { status: 503 }))
    const result = await fetchNewsletterPages({ links: [{ url, label: 'Atlanta' }], policy: { allowedHost: 'www.mtgfestivals.com', pathPrefixes: ['/global/en-us/magiccon-news/'] }, limits: { timeoutMs: 15, maxBytes: 512, maxTextChars: 512 }, seen: { [url]: 'prior hash' }, lastFetchedAt: { [url]: 'prior time' }, observedAt: 'new time', fetchImpl })
    expect(result.seen).toEqual({ [url]: 'prior hash' })
    expect(result.lastFetchedAt).toEqual({ [url]: 'prior time' })
    expect(result.coverageStatus).toBe('partial')
    expect(result.failureCount ?? result.failures.length).toBe(1)
    expect(result.observations).toEqual([])
  })
  it('recovers a newsletter transient response without weakening redirect or content policy', async () => {
    const url = 'https://www.mtgfestivals.com/global/en-us/magiccon-news/atlanta.html'
    const fetchImpl = vi.fn().mockResolvedValueOnce(new Response('busy', { status: 429, headers: { 'retry-after': '0' } })).mockResolvedValueOnce(new Response('<article>MagicCon Atlanta update</article>', { headers: { 'content-type': 'text/html' } }))
    const result = await fetchNewsletterPages({ links: [{ url, label: 'Atlanta' }], policy: { allowedHost: 'www.mtgfestivals.com', pathPrefixes: ['/global/en-us/magiccon-news/'] }, limits: { timeoutMs: 100, maxBytes: 512, maxTextChars: 512 }, observedAt: 'new time', fetchImpl })
    expect(result.failures).toEqual([])
    expect(result.lastFetchedAt[url]).toBe('new time')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    expect(fetchImpl.mock.calls.every(call => call[1].redirect === 'manual' && call[1].signal instanceof AbortSignal)).toBe(true)
  })
})
