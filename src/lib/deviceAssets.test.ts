import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cacheDeviceAssets, DEVICE_ASSET_CACHE } from './deviceAssets'

describe('device asset pack', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true })
  })

  it('warms the same cache the service worker serves while offline', () => {
    const config = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf8')
    expect(DEVICE_ASSET_CACHE).toBe('magiccon-remote-images-v1')
    expect(config).toContain(`cacheName: '${DEVICE_ASSET_CACHE}'`)
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
})
