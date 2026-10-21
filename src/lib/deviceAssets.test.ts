import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { auditDeviceAssets, cacheDeviceAssets, DEVICE_ASSET_CACHE, exhibitorAssetUrls } from './deviceAssets'

describe('device asset pack', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('warms the same cache the service worker serves while offline', () => {
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')
    expect(DEVICE_ASSET_CACHE).toBe('magiccon-remote-images-v1')
    expect(config).toContain(`cacheName: '${DEVICE_ASSET_CACHE}'`)
    expect(config).toContain("request.destination === 'image'")
    expect(config).toContain("request.cache !== 'reload'")
    expect(config).not.toContain('maxEntries: 250')
  })

  it('deduplicates and stores every requested asset', async () => {
    const matches = new Map<string, Response>()
    const cache = {
      match: vi.fn(async (request: Request) => matches.get(request.url)),
      put: vi.fn(async (request: Request, response: Response) => { matches.set(request.url, response) }),
    }
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('image', { status: 200 })))
    const result = await cacheDeviceAssets(['/one.jpg', '/one.jpg', 'https://cards.example/two.jpg'])
    expect(result).toEqual({ expected: 2, cached: 2, failures: [] })
    expect(caches.open).toHaveBeenCalledWith(DEVICE_ASSET_CACHE)
    expect(cache.put).toHaveBeenCalledTimes(2)
  })

  it('reports an incomplete pack instead of claiming offline readiness', async () => {
    vi.stubGlobal('caches', { open: vi.fn(async () => ({ match: vi.fn(), put: vi.fn() })) })
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network') }))
    expect(await cacheDeviceAssets(['/missing.jpg'])).toEqual({ expected: 1, cached: 0, failures: ['/missing.jpg'] })
  })
  it('includes every exhibitor logo and offer image, not only highlights or saved booths', () => {
    expect(exhibitorAssetUrls([
      { imageUrl: '/logo', specials: [{ imageUrl: '/special' }, {}], exclusives: [{ imageUrl: '/exclusive' }] },
      { imageUrl: '/other-logo' },
    ]).filter(Boolean)).toEqual(['/logo', '/special', '/exclusive', '/other-logo'])
  })
  it('refreshes changed image bytes at the same URL when the directory refreshes', async () => {
    const cache = { match: vi.fn(async () => new Response('old')), put: vi.fn() }
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('new')))
    expect(await cacheDeviceAssets(['/logo'], true)).toEqual({ expected: 1, cached: 1, failures: [] })
    expect(fetch).toHaveBeenCalledWith(expect.any(Request), { cache: 'reload' })
    expect(await cache.put.mock.calls[0][1].text()).toBe('new')
  })
  it('reports cache storage denial as an incomplete pack instead of rejecting background hydration', async () => {
    vi.stubGlobal('caches', { open: vi.fn(async () => { throw new Error('denied') }) })
    expect(await cacheDeviceAssets(['/logo'])).toEqual({ expected: 1, cached: 0, failures: ['/logo'] })
  })
  it('bounds same-URL revalidation across brief resumes but refreshes again after five minutes', async () => {
    const now = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    const cache = { match: vi.fn(async () => new Response('cached')), put: vi.fn() }
    vi.stubGlobal('caches', { open: vi.fn(async () => cache) })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('fresh')))
    await Promise.all([cacheDeviceAssets(['/bounded-logo'], true), cacheDeviceAssets(['/bounded-logo'], true)])
    await cacheDeviceAssets(['/bounded-logo'], true)
    expect(fetch).toHaveBeenCalledTimes(1)
    now.mockReturnValue(1_300_001)
    await cacheDeviceAssets(['/bounded-logo'], true)
    expect(fetch).toHaveBeenCalledTimes(2)
    now.mockRestore()
  })
  it('checks existing cache entries offline without fetching and detects eviction', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    vi.stubGlobal('fetch', vi.fn())
    vi.stubGlobal('caches', { open: vi.fn(async () => ({ match: vi.fn(async (request: Request) => request.url.endsWith('/saved.jpg') ? new Response('image') : undefined) })) })
    expect(await auditDeviceAssets(['/saved.jpg', '/evicted.jpg'])).toEqual({ expected: 2, cached: 1, failures: ['/evicted.jpg'] })
    expect(fetch).not.toHaveBeenCalled()
  })
})
